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
  // Get the first query for display (in multi-query cases, we'll show the first one)
  const primaryQuery = search.queries[0]
  const isMultiRequest = search.queries.length > 1
  const hasQueryId = !!primaryQuery.queryID
  const hasUserToken = !!primaryQuery.userToken
  
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
              {isMultiRequest && (
                <span className="batch-position">
                  ({search.queries.length} queries)
                </span>
              )}
            </span>
            <span className="index-name">
              {primaryQuery.index}
            </span>
          </div>
          
          <div className="card-details">
            <div className="query-text">
              <strong>Query:</strong> "{extractSearchQuery(primaryQuery.params)}"
            </div>
            {(() => {
              const additionalParams = extractSearchParams(primaryQuery.params)
              return additionalParams.length > 0 ? (
                <div className="query-params">
                  {additionalParams.join(' • ')}
                </div>
              ) : null
            })()}
            <span className="query-id">
              Query ID: {hasQueryId ? primaryQuery.queryID : 'missing'}
            </span>
            <span className="user-token">
              User Token: {hasUserToken ? primaryQuery.userToken : 'missing'}
            </span>
            <span className="time">
              {new Date(search.ts).toLocaleTimeString()}
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
