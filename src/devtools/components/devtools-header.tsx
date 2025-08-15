import React, { useState, useEffect } from 'react'
import { useAppStore } from '../../store'
import { Play, Square, Trash2, Download } from 'lucide-react'

interface DevToolsHeaderProps {
  onStartCapture: (tabId: number) => void
  onStopCapture: (tabId: number) => void
}

export function DevToolsHeader({ onStartCapture, onStopCapture }: DevToolsHeaderProps) {
  const { activeTabId, tabs, startCapture, stopCapture, clearTabData, initializeTab } = useAppStore()
  const [isCapturing, setIsCapturing] = useState(false)
  const [devToolsTabId, setDevToolsTabId] = useState<number | null>(null)

  const currentTab = activeTabId ? tabs[activeTabId] : null

  useEffect(() => {
    // Get the tab ID from DevTools
    if (chrome.devtools && chrome.devtools.inspectedWindow) {
      const tabId = chrome.devtools.inspectedWindow.tabId
      if (tabId) {
        setDevToolsTabId(tabId)

        // Initialize the tab in the store directly
        if (!tabs[tabId]) {
          initializeTab(tabId)
        }
      }
    }
  }, [initializeTab, tabs])

  useEffect(() => {
    if (currentTab) {
      setIsCapturing(currentTab.isCapturing)
    }
  }, [currentTab])

  const handleStartCapture = () => {
    const targetTabId = devToolsTabId || activeTabId
    if (targetTabId) {
      // Start capture in the store
      startCapture(targetTabId)
      setIsCapturing(true)

      // Call the setup function directly
      onStartCapture(targetTabId)
    }
  }

  const handleStopCapture = () => {
    const targetTabId = devToolsTabId || activeTabId
    if (targetTabId) {
      // Stop capture in the store
      stopCapture(targetTabId)
      setIsCapturing(false)

      // Call the stop function directly
      onStopCapture(targetTabId)
    }
  }

  const handleClear = () => {
    const targetTabId = devToolsTabId || activeTabId
    if (targetTabId) {
      clearTabData(targetTabId)
    }
  }

  const handleExport = () => {
    const targetTabId = devToolsTabId || activeTabId
    if (targetTabId) {
      console.log(`Export requested for tab: ${targetTabId}`)
      // TODO: Implement export functionality
    }
  }

  const effectiveTabId = devToolsTabId || activeTabId

  return (
    <div className="devtools-header">
      <div className="header-content">
        <div className="header-left">
          <h1 className="header-title">
            Algolia Front End Validator
          </h1>

          {effectiveTabId && (
            <div className="tab-info">
              <span className="tab-label">Tab:</span>
              <span className="tab-id">
                {effectiveTabId}
              </span>
            </div>
          )}
        </div>

        <div className="header-controls">
          {!isCapturing ? (
            <button
              onClick={handleStartCapture}
              disabled={!effectiveTabId}
              className="btn btn-primary"
            >
              <Play className="w-4 h-4" />
              Start Capture
            </button>
          ) : (
            <button
              onClick={handleStopCapture}
              className="btn btn-danger"
            >
              <Square className="w-4 h-4" />
              Stop Capture
            </button>
          )}

          <button
            onClick={handleClear}
            disabled={!effectiveTabId}
            className="btn btn-outline"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>

          <button
            onClick={handleExport}
            disabled={!effectiveTabId}
            className="btn btn-outline"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {isCapturing && (
        <div className="status-indicator">
          <div className="status-dot green"></div>
          <span className="status-text green">
            Capturing Algolia traffic...
          </span>
        </div>
      )}

      {!effectiveTabId && (
        <div className="status-indicator">
          <div className="status-dot yellow"></div>
          <span className="status-text yellow">
            Waiting for tab initialization...
          </span>
        </div>
      )}
    </div>
  )
}
