import React, { useState } from 'react'
import type { TrafficItem } from '../../shared/types'
import { ChevronRight, AlertTriangle } from 'lucide-react'

interface DetailPanelProps {
  item: TrafficItem
}

export function DetailPanel({ item }: DetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'fields' | 'snippets'>('fields')

  const renderExtractedFields = () => {
    if ('appId' in item) {
      // Search request
      return (
        <div className="extracted-fields">
          <div className="field-label">queryID:</div>
          <div className="field-value">
            {item.queryId || 'missing'}
          </div>
          
          <div className="field-label">userToken:</div>
          <div className={`field-value ${!item.userToken ? 'warning' : ''}`}>
            <div className="field-warning">
              {item.userToken || 'missing'}
              {!item.userToken && <AlertTriangle className="warning-icon" />}
            </div>
          </div>
          
          <div className="field-label">index:</div>
          <div className="field-value">
            {Array.isArray(item.indices) ? item.indices.join(', ') : String(item.indices || 'unknown')}
          </div>
          
          <div className="field-label">timestamp:</div>
          <div className="field-value">
            {new Date(item.time).toLocaleTimeString()}
          </div>
          
          <div className="field-label">requestID:</div>
          <div className="field-value">
            {item.requestId}
          </div>
          
          {item.isMultiRequest && item.totalRequests && item.requestIndex !== undefined && (
            <>
              <div className="field-label">queryIndex:</div>
              <div className="field-value">
                {item.requestIndex + 1} of {item.totalRequests}
              </div>
            </>
          )}
        </div>
      )
    } else {
      // Event request
      return (
        <div className="extracted-fields">
          <div className="field-label">eventType:</div>
          <div className="field-value">
            {item.type}
          </div>
          
          <div className="field-label">eventName:</div>
          <div className="field-value">
            {item.eventName}
          </div>
          
          <div className="field-label">index:</div>
          <div className="field-value">
            {item.index}
          </div>
          
          <div className="field-label">userToken:</div>
          <div className={`field-value ${!item.userToken ? 'warning' : ''}`}>
            <div className="field-warning">
              {item.userToken || 'missing'}
              {!item.userToken && <AlertTriangle className="warning-icon" />}
            </div>
          </div>
          
          <div className="field-label">queryID:</div>
          <div className="field-value">
            {item.queryId || 'missing'}
          </div>
          
          <div className="field-label">timestamp:</div>
          <div className="field-value">
            {new Date(item.time).toLocaleTimeString()}
          </div>
          
          {item.objectIDs && item.objectIDs.length > 0 && (
            <>
              <div className="field-label">objectIDs:</div>
              <div className="field-value">
                {item.objectIDs.join(', ')}
              </div>
            </>
          )}
        </div>
      )
    }
  }

  const renderRawSnippets = () => {
    if ('appId' in item) {
      // Search request
      return (
        <div className="raw-snippets">
          <div className="snippet-section">
            <div className="snippet-header">Request Headers</div>
            <div className="snippet-content">
              {JSON.stringify(item.headers, null, 2)}
            </div>
          </div>
          
          <div className="snippet-section">
            <div className="snippet-header">Request Body</div>
            <div className="snippet-content">
              {item.rawRequestBody || 'No request body'}
            </div>
          </div>
          
          <div className="snippet-section">
            <div className="snippet-header">Response Snippet</div>
            <div className="snippet-content">
              {item.responseSnippet}
            </div>
          </div>
          
          <div className="snippet-section">
            <div className="snippet-header">Request Parameters</div>
            <div className="snippet-content">
              {item.params}
            </div>
          </div>
        </div>
      )
    } else {
      // Event request
      return (
        <div className="raw-snippets">
          <div className="snippet-section">
            <div className="snippet-header">Event Payload</div>
            <div className="snippet-content">
              {item.payloadSnippet}
            </div>
          </div>
          
          <div className="snippet-section">
            <div className="snippet-header">URL</div>
            <div className="snippet-content">
              {item.url}
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
