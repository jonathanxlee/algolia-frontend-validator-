import React from 'react'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import type { SearchRequest } from '../types'
import { DetailPanel } from '../pages/detail-panel'
import { extractSearchQuery, extractSearchParams } from '../utils/query-parser'

interface SearchCardProps {
  search: SearchRequest
  isExpanded: boolean
  onToggle: () => void
  level: number
  batchId?: string | null
  isLastInGroup: boolean
  hasChildren: boolean
}

export function SearchCard({ 
  search, 
  isExpanded, 
  onToggle, 
  level, 
  batchId, 
  isLastInGroup, 
  hasChildren 
}: SearchCardProps) {
  const isMultiRequest = search.isMultiRequest
  const hasQueryId = !!search.queryId
  const hasUserToken = !!search.userToken
  
  return (
    <div 
      className={`search-card level-${level}`}
      style={{ marginLeft: `${level * 20}px` }}
    >
      <div className="card-header" onClick={onToggle}>
        <div className="card-icon">
          <Search className="w-4 h-4" />
        </div>
        
        <div className="card-content">
          <div className="card-title">
            <span className="request-type">
              {isMultiRequest ? 'Search (Multi)' : 'Search (Single)'}
              {isMultiRequest && search.requestIndex && search.totalRequests && (
                <span className="batch-position">
                  ({search.requestIndex}/{search.totalRequests})
                </span>
              )}
            </span>
            <span className="index-name">
              {Array.isArray(search.indices) ? search.indices.join(', ') : search.indices}
            </span>
          </div>
          
          <div className="card-details">
            <div className="query-text">
              <strong>Query:</strong> "{extractSearchQuery(search.params)}"
            </div>
            {(() => {
              const additionalParams = extractSearchParams(search.params)
              return additionalParams.length > 0 ? (
                <div className="query-params">
                  {additionalParams.join(' • ')}
                </div>
              ) : null
            })()}
            <span className="query-id">
              Query ID: {hasQueryId ? search.queryId : 'missing'}
            </span>
            <span className="user-token">
              User Token: {hasUserToken ? search.userToken : 'missing'}
            </span>
            <span className="time">
              {new Date(search.time).toLocaleTimeString()}
            </span>
          </div>
        </div>
        
        <div className="card-status">
          <span className={`status-badge ${hasQueryId ? 'valid' : 'neutral'}`}>
            {hasQueryId ? 'Valid' : 'No Query ID'}
          </span>
        </div>
        
        <div className="card-toggle">
          {hasChildren ? (
            isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          ) : null}
        </div>
      </div>
      
      <div className="card-actions">
        <button className="action-btn">
          + Expect
        </button>
        <button className="action-btn primary" onClick={onToggle}>
          Details
        </button>
      </div>
      
      {isExpanded && (
        <div className="card-details-panel">
          <DetailPanel item={search} />
        </div>
      )}
    </div>
  )
}
