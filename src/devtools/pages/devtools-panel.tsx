import React, { useEffect, useState, useRef } from 'react'
import { useAppStore } from '../../store'
import { DevToolsHeader } from '../components/devtools-header'
import { Navigation } from '../components/navigation'
import { Searches } from './searches'
import { Events } from './events'
import { Issues, Expectations, Settings } from './placeholder-views'
import { parseSearchRequest, parseInsightsRequest } from '../utils/request-parsers'

export function DevToolsPanel() {
  const [activeView, setActiveView] = useState<string>('searches')
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [contextError, setContextError] = useState<string | null>(null)
  
  // FIXED: Use useRef instead of useState to persist processedRequests across renders
  const processedRequests = useRef<Set<string>>(new Set())

  const {
    activeTabId,
    setActiveTab,
    initializeTab,
    addSearch,
    addEvent
  } = useAppStore()

  useEffect(() => {
    const tabId = chrome.devtools.inspectedWindow.tabId
    if (tabId) {
      setActiveTab(tabId)
      initializeTab(tabId)
      // Don't setup debugger here - wait for Start Capture
    }
  }, [setActiveTab, initializeTab])

  const handleStartCapture = (tabId: number) => {
    // Send message to background script to start debugger monitoring
    chrome.runtime.sendMessage({
      type: 'START_MONITORING',
      tabId
    }, (response) => {
      if (response && response.success) {
        setIsMonitoring(true)
      } else {
        setContextError('Failed to start network monitoring')
      }
    })
  }

  const handleStopCapture = (tabId: number) => {
    // Send message to background script to stop debugger monitoring
    chrome.runtime.sendMessage({
      type: 'STOP_MONITORING',
      tabId
    }, (response) => {
      if (response && response.success) {
        setIsMonitoring(false)
        // FIXED: Clear processed requests when stopping capture
        processedRequests.current.clear()
        console.log('[DEBUG] Capture stopped, processed requests cleared')
      }
    })
  }

  // Listen for messages from background script
  useEffect(() => {
    const handleBackgroundMessage = (message: any) => {
      // Handle forwarded messages from background script
      if (message.type === 'FORWARD_TO_DEVTOOLS') {
        const { messageType, data } = message
        
        if (messageType === 'ALGOLIA_INSIGHTS_REQUEST') {
          const { requestData } = data
          const requestId = data.requestId
          
          // Check for duplicates using the persistent Set
          const duplicateKey = `insights_${requestId}`
          if (processedRequests.current.has(duplicateKey)) {
            console.log('[DEBUG] Duplicate insights request ignored:', requestId)
            return
          }
          
          // Extract post data properly
          let postData = '{}'
          if (requestData.postData) {
            if (typeof requestData.postData === 'string') {
              postData = requestData.postData
            } else if (requestData.postData.text) {
              postData = requestData.postData.text
            } else if (requestData.postData.raw) {
              postData = requestData.postData.raw
            } else {
              postData = JSON.stringify(requestData.postData)
            }
          }
          
          console.log('[DEBUG] Processing insights request with post data:', postData.substring(0, 200))
          
          // Process insights request
          const eventData = parseInsightsRequest(requestData.request, postData, data.timestamp)
          if (eventData) {
            addEvent(activeTabId!, eventData)
            processedRequests.current.add(duplicateKey)
            console.log('[DEBUG] Insights request processed:', requestId, 'Events:', eventData.events.length)
          } else {
            console.log('[DEBUG] Failed to parse insights request:', requestId)
          }
        }
        
        if (messageType === 'ALGOLIA_SEARCH_RESPONSE') {
          const { responseBody, requestData } = data
          const requestId = data.requestId
          
          // Check for duplicates using the persistent Set
          const duplicateKey = `search_${requestId}`
          if (processedRequests.current.has(duplicateKey)) {
            console.log('[DEBUG] Duplicate search request ignored:', requestId)
            return
          }
          
          const url = new URL(requestData.request.url)
          const appId = url.hostname.split('.')[0]
          
          // Process search request
          const searchResult = parseSearchRequest(requestData.request, responseBody, appId, data.timestamp)
          if (searchResult) {
            addSearch(activeTabId!, searchResult)
            processedRequests.current.add(duplicateKey)
            console.log('[DEBUG] Search request processed:', requestId)
          }
        }
      }
    }

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(handleBackgroundMessage)
    
    return () => {
      chrome.runtime.onMessage.removeListener(handleBackgroundMessage)
    }
  }, [activeTabId, addSearch, addEvent]) // FIXED: Removed processedRequests from dependencies

  const renderView = () => {
    switch (activeView) {
      case 'searches':
        return <Searches />           // ✅ NEW: Replaces LiveTraffic
      case 'events':
        return <Events />             // ✅ NEW: Shows all events
      case 'issues':
        return <Issues />
      case 'expectations':
        return <Expectations />
      case 'settings':
        return <Settings />
      default:
        return <Searches />
    }
  }

  // Show error state if context is invalid
  if (contextError) {
    return (
      <div className="devtools-panel">
        <div className="empty-state">
          <div className="empty-state-title" style={{ color: '#dc2626' }}>
            Extension Error
          </div>
          <div className="empty-state-subtitle">
            {contextError}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
            style={{ marginTop: '16px' }}
          >
            Refresh DevTools Panel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="devtools-panel">
      <DevToolsHeader onStartCapture={handleStartCapture} onStopCapture={handleStopCapture} />
      <Navigation
        currentView={activeView}
        onViewChange={setActiveView}
      />
      <div className="main-content">
        {renderView()}
      </div>
    </div>
  )
}
