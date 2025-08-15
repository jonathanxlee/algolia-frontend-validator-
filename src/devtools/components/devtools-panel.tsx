import React, { useEffect, useState } from 'react'
import { useAppStore } from '../../store'
import { DevToolsHeader } from './devtools-header'
import { Navigation } from './navigation'
import { LiveTraffic } from '../pages/live-traffic'
import { Correlations, Issues, Expectations, Settings } from '../pages/placeholder-views'
import { parseSearchRequest, parseInsightsRequest } from '../utils/request-parsers'

export function DevToolsPanel() {
  const [activeView, setActiveView] = useState<string>('live-traffic')
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [contextError, setContextError] = useState<string | null>(null)
  const [processedRequests] = useState<Set<string>>(new Set())

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
          
          // Check for duplicates
          const duplicateKey = `insights_${requestId}`
          if (processedRequests.has(duplicateKey)) {
            return
          }
          
          // Process insights request
          const eventData = parseInsightsRequest(requestData.request, requestData.postData || '{}')
          if (eventData) {
            addEvent(activeTabId!, eventData)
            processedRequests.add(duplicateKey)
          }
        }
        
        if (messageType === 'ALGOLIA_SEARCH_RESPONSE') {
          const { responseBody, requestData } = data
          const requestId = data.requestId
          
          // Check for duplicates
          const duplicateKey = `search_${requestId}`
          if (processedRequests.has(duplicateKey)) {
            return
          }
          
          const url = new URL(requestData.request.url)
          const appId = url.hostname.split('.')[0]
          
          // Process search request
          const searchResult = parseSearchRequest(requestData.request, responseBody, appId)
          if (searchResult) {
            if (Array.isArray(searchResult)) {
              searchResult.forEach((searchData) => {
                addSearch(activeTabId!, searchData)
              })
            } else {
              addSearch(activeTabId!, searchResult)
            }
            processedRequests.add(duplicateKey)
          }
        }
      }
    }

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(handleBackgroundMessage)
    
    return () => {
      chrome.runtime.onMessage.removeListener(handleBackgroundMessage)
    }
  }, [activeTabId, addSearch, addEvent, processedRequests])

  const renderView = () => {
    switch (activeView) {
      case 'live-traffic':
        return <LiveTraffic />
      case 'correlations':
        return <Correlations />
      case 'issues':
        return <Issues />
      case 'expectations':
        return <Expectations />
      case 'settings':
        return <Settings />
      default:
        return <LiveTraffic />
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
