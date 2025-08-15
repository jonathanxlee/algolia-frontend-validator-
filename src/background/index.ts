/**
 * Background Service Worker for Algolia Front End Validator
 * 
 * This service worker handles network interception using the Chrome Debugger API
 * to capture Algolia Search and Insights requests. It communicates with the
 * DevTools panel to provide real-time traffic monitoring and validation.
 */

import { SearchRequest, EventRequest } from '../devtools/types'

/**
 * Background service worker class for managing debugger connections
 * and network request interception
 */
class BackgroundServiceWorker {
  private debuggerConnections: Map<number, boolean> = new Map()
  private requestDataStore: Map<string, { request: any; postData?: any; timestamp: number }> = new Map()

  constructor() {
    this.setupMessageListeners()
  }

  /**
   * Set up message listeners for communication with DevTools panel
   */
  private setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'START_MONITORING') {
        this.startMonitoring(message.tabId)
        sendResponse({ success: true })
      } else if (message.type === 'STOP_MONITORING') {
        this.stopMonitoring(message.tabId)
        sendResponse({ success: true })
      }
      return true // Keep message channel open for async response
    })
  }

  /**
   * Start monitoring network traffic for a specific tab
   */
  private startMonitoring(tabId: number) {
    if (this.debuggerConnections.has(tabId)) {
      return
    }

    chrome.debugger.attach({ tabId }, '1.3', () => {
      if (chrome.runtime.lastError) {
        console.error('Failed to attach debugger:', chrome.runtime.lastError)
        return
      }

      // Enable network tracking
      chrome.debugger.sendCommand({ tabId }, 'Network.enable', {}, () => {
        if (chrome.runtime.lastError) {
          console.error('Failed to enable network:', chrome.runtime.lastError)
          return
        }

        this.debuggerConnections.set(tabId, true)
        
        // Listen for debugger events
        chrome.debugger.onEvent.addListener((source, method, params) => {
          if (source.tabId === tabId) {
            this.handleDebuggerEvent(method, params, tabId)
          }
        })
      })
    })
  }

  /**
   * Stop monitoring network traffic for a specific tab
   */
  private stopMonitoring(tabId: number) {
    if (this.debuggerConnections.has(tabId)) {
      chrome.debugger.detach({ tabId })
      this.debuggerConnections.delete(tabId)
      
      // Clean up stored request data for this tab
      for (const [key] of this.requestDataStore) {
        if (key.startsWith(`${tabId}_`)) {
          this.requestDataStore.delete(key)
        }
      }
    }
  }

  /**
   * Handle debugger events for network requests
   */
  private handleDebuggerEvent(method: string, params: any, tabId: number) {
    const requestId = params.requestId
    
    if (method === 'Network.requestWillBeSent') {
      const { request, postData } = params
      
      // Check if this is an Algolia request
      if (this.isAlgoliaRequest(request.url)) {
        // Check if we've already processed this request
        const requestKey = `${tabId}_${requestId}`
        if (this.requestDataStore.has(requestKey)) {
          return
        }
        
        // Store request data with timestamp
        this.requestDataStore.set(requestKey, { 
          request, 
          postData,
          timestamp: Date.now() // Capture actual request time
        })
        
        // Send message to DevTools panel
        this.notifyDevTools('ALGOLIA_REQUEST_DETECTED', {
          requestId,
          url: request.url,
          method: request.method,
          hasPostData: !!postData
        })
      }
    }
    
    if (method === 'Network.responseReceived') {
      // Check if we have stored request data
      const requestKey = `${tabId}_${requestId}`
      const requestData = this.requestDataStore.get(requestKey)
      
      if (requestData && this.isAlgoliaRequest(requestData.request.url)) {
        // Get response body for search requests
        if (this.isSearchRequest(requestData.request.url)) {
          chrome.debugger.sendCommand({ tabId }, 'Network.getResponseBody', { requestId }, (responseBody: any) => {
            if (responseBody && !responseBody.error) {
              this.notifyDevTools('ALGOLIA_SEARCH_RESPONSE', {
                requestId,
                url: requestData.request.url,
                responseBody: responseBody.body,
                requestData,
                timestamp: requestData.timestamp
              })
            }
          })
        } else if (this.isInsightsRequest(requestData.request.url)) {
          // For insights, send the request data (no response body needed)
          this.notifyDevTools('ALGOLIA_INSIGHTS_REQUEST', {
            requestId,
            url: requestData.request.url,
            requestData,
            timestamp: requestData.timestamp
          })
        }
      }
    }
    
    if (method === 'Network.loadingFinished') {
      // Clean up stored request data
      const requestKey = `${tabId}_${requestId}`
      if (this.requestDataStore.has(requestKey)) {
        this.requestDataStore.delete(requestKey)
      }
    }
  }

  /**
   * Check if a URL is an Algolia request
   */
  private isAlgoliaRequest(url: string): boolean {
    const algoliaPatterns = [
      /^https:\/\/.*\.algolia\.net\/.*/,
      /^https:\/\/.*\.algolianet\.com\/.*/,
      /^https:\/\/insights\.algolia\.io\/.*/,
      /^https:\/\/insights\..*\.algolia\.io\/.*/
    ]
    
    return algoliaPatterns.some(pattern => pattern.test(url))
  }

  /**
   * Check if a URL is a search request
   */
  private isSearchRequest(url: string): boolean {
    return url.includes('/1/indexes/') && (url.includes('/query') || url.includes('/queries'))
  }

  /**
   * Check if a URL is an insights request
   */
  private isInsightsRequest(url: string): boolean {
    return url.includes('/1/events')
  }

  /**
   * Notify DevTools panel of events
   */
  private notifyDevTools(messageType: string, data: any) {
    chrome.runtime.sendMessage({
      type: 'FORWARD_TO_DEVTOOLS',
      messageType,
      data
    })
  }
}

// Initialize the background service worker
new BackgroundServiceWorker()
