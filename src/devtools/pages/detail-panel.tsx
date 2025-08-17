import React, { useState } from 'react'
import type { NetworkRequest, SearchRequest, InsightsRequest, InsightsEvent } from '../types'
import { ChevronRight, AlertTriangle } from 'lucide-react'

interface DetailPanelProps {
  item: NetworkRequest | InsightsEvent
}

export function DetailPanel({ item }: DetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'fields' | 'snippets'>('fields')

  const renderExtractedFields = () => {
    if ('queries' in item) {
      // Search request
      const search = item as SearchRequest
      const primaryQuery = search.queries[0]
      
      return (
        <div className="extracted-fields">
          <div className="field-label">queryID:</div>
          <div className="field-value">
            {primaryQuery.queryID || 'missing'}
          </div>
          
          <div className="field-label">userToken:</div>
          <div className={`field-value ${!primaryQuery.userToken ? 'warning' : ''}`}>
            <div className="field-warning">
              {primaryQuery.userToken || 'missing'}
              {!primaryQuery.userToken && <AlertTriangle className="warning-icon" />}
            </div>
          </div>
          
          <div className="field-label">index:</div>
          <div className="field-value">
            {primaryQuery.index}
          </div>
          
          <div className="field-label">timestamp:</div>
          <div className="field-value">
            {new Date(search.ts).toLocaleTimeString()}
          </div>
          
          <div className="field-label">queries count:</div>
          <div className="field-value">
            {search.queries.length}
          </div>
          
          {search.queries.length > 1 && (
            <>
              <div className="field-label">multi-query:</div>
              <div className="field-value">
                Yes ({search.queries.length} queries)
              </div>
            </>
          )}
        </div>
      )
    } else if ('events' in item) {
      // Insights request - show first event details
      const insights = item as InsightsRequest
      const primaryEvent = insights.events[0]
      
      return (
        <div className="extracted-fields">
          <div className="field-label">eventType:</div>
          <div className="field-value">
            {primaryEvent.eventType}
          </div>
          
          <div className="field-label">eventName:</div>
          <div className="field-value">
            {primaryEvent.eventName}
          </div>
          
          <div className="field-label">index:</div>
          <div className="field-value">
            {primaryEvent.index}
          </div>
          
          <div className="field-label">userToken:</div>
          <div className={`field-value ${!primaryEvent.userToken ? 'warning' : ''}`}>
            <div className="field-warning">
              {primaryEvent.userToken || 'missing'}
              {!primaryEvent.userToken && <AlertTriangle className="warning-icon" />}
            </div>
          </div>
          
          <div className="field-label">queryID:</div>
          <div className="field-value">
            {primaryEvent.queryID || 'missing'}
          </div>
          
          <div className="field-label">timestamp:</div>
          <div className="field-value">
            {new Date(primaryEvent.eventTs || insights.ts).toLocaleTimeString()}
          </div>
          
          {primaryEvent.objectIDs && primaryEvent.objectIDs.length > 0 && (
            <>
              <div className="field-label">objectIDs:</div>
              <div className="field-value">
                {primaryEvent.objectIDs.join(', ')}
              </div>
            </>
          )}
          
          <div className="field-label">events count:</div>
          <div className="field-value">
            {insights.events.length}
          </div>
        </div>
      )
    } else {
      // Individual InsightsEvent
      const event = item as InsightsEvent
      
      return (
        <div className="extracted-fields">
          <div className="field-label">eventType:</div>
          <div className="field-value">
            {event.eventType}
          </div>
          
          <div className="field-label">eventName:</div>
          <div className="field-value">
            {event.eventName}
          </div>
          
          <div className="field-label">index:</div>
          <div className="field-value">
            {event.index}
          </div>
          
          <div className="field-label">userToken:</div>
          <div className={`field-value ${!event.userToken ? 'warning' : ''}`}>
            <div className="field-warning">
              {event.userToken || 'missing'}
              {!event.userToken && <AlertTriangle className="warning-icon" />}
            </div>
          </div>
          
          <div className="field-label">queryID:</div>
          <div className="field-value">
            {event.queryID || 'missing'}
          </div>
          
          <div className="field-label">timestamp:</div>
          <div className="field-value">
            {new Date(event.eventTs || Date.now()).toLocaleTimeString()}
          </div>
          
          {event.objectIDs && event.objectIDs.length > 0 && (
            <>
              <div className="field-label">objectIDs:</div>
              <div className="field-value">
                {event.objectIDs.join(', ')}
              </div>
            </>
          )}
        </div>
      )
    }
  }

  const renderRawSnippets = () => {
    if ('queries' in item) {
      // Search request
      const search = item as SearchRequest
      const primaryQuery = search.queries[0]
      
      return (
        <div className="raw-snippets">
          <div className="snippet-section">
            <div className="snippet-header">Request Headers</div>
            <div className="snippet-content">
              {JSON.stringify(search.requestHeaders, null, 2)}
            </div>
          </div>
          
          <div className="snippet-section">
            <div className="snippet-header">Request Body</div>
            <div className="snippet-content">
              {search.requestBody || 'No request body'}
            </div>
          </div>
          
          <div className="snippet-section">
            <div className="snippet-header">Response Body</div>
            <div className="snippet-content">
              {search.responseBody}
            </div>
          </div>
          
          <div className="snippet-section">
            <div className="snippet-header">Request Parameters</div>
            <div className="snippet-content">
              {primaryQuery.params}
            </div>
          </div>
        </div>
      )
    } else if ('events' in item) {
      // Insights request
      const insights = item as InsightsRequest
      const primaryEvent = insights.events[0]
      
      return (
        <div className="raw-snippets">
          <div className="snippet-section">
            <div className="snippet-header">Event Payload</div>
            <div className="snippet-content">
              {JSON.stringify(primaryEvent, null, 2)}
            </div>
          </div>
          
          <div className="snippet-section">
            <div className="snippet-header">URL</div>
            <div className="snippet-content">
              {insights.url}
            </div>
          </div>
        </div>
      )
    } else {
      // Individual InsightsEvent
      const event = item as InsightsEvent
      
      return (
        <div className="raw-snippets">
          <div className="snippet-section">
            <div className="snippet-header">Event Data</div>
            <div className="snippet-content">
              {JSON.stringify(event, null, 2)}
            </div>
          </div>
        </div>
      )
    }
  }

  return (
    <div className="detail-panel">
      <div className="detail-tabs">
        <button
          className={`detail-tab ${activeTab === 'fields' ? 'active' : ''}`}
          onClick={() => setActiveTab('fields')}
        >
          Extracted Fields
        </button>
        <button
          className={`detail-tab ${activeTab === 'snippets' ? 'active' : ''}`}
          onClick={() => setActiveTab('snippets')}
        >
          Raw Snippets
        </button>
      </div>
      
      <div className={`detail-content ${activeTab === 'fields' ? 'active' : ''}`}>
        {renderExtractedFields()}
      </div>
      
      <div className={`detail-content ${activeTab === 'snippets' ? 'active' : ''}`}>
        {renderRawSnippets()}
      </div>
    </div>
  )
}
