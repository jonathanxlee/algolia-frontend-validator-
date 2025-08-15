import React, { useState, useMemo } from 'react'
import { useAppStore } from '../../store'
import type { TrafficItem } from '../types'
import { Search, AlertTriangle, ChevronRight, Filter, X } from 'lucide-react'
import { DetailPanel } from './detail-panel'

export function LiveTraffic() {
  const { activeTabId, tabs } = useAppStore()
  const activeTab = activeTabId ? tabs[activeTabId] : null
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [showOnlyErrors, setShowOnlyErrors] = useState(false)
  const [filterText, setFilterText] = useState('')
  
  // Filter and sort traffic - always compute this
  const filteredTraffic = useMemo(() => {
    if (!activeTab) return []
    
    const { searches, events } = activeTab
    let traffic: TrafficItem[] = [...searches, ...events]
    
    // Filter by text search
    if (filterText) {
      const lowerFilter = filterText.toLowerCase()
      traffic = traffic.filter(item => {
        if ('appId' in item) {
          // Search request
          return (
            item.indices.some(index => index.toLowerCase().includes(lowerFilter)) ||
            (item.queryId && item.queryId.toLowerCase().includes(lowerFilter)) ||
            (item.userToken && item.userToken.toLowerCase().includes(lowerFilter))
          )
        } else {
          // Event request
          return (
            item.index.toLowerCase().includes(lowerFilter) ||
            item.eventName.toLowerCase().includes(lowerFilter) ||
            (item.queryId && item.queryId.toLowerCase().includes(lowerFilter))
          )
        }
      })
    }
    
    // Filter by errors only
    if (showOnlyErrors) {
      traffic = traffic.filter(item => {
        if ('appId' in item) {
          return !item.queryId // Missing query ID is an error
        } else {
          return !item.userToken // Missing user token is an error
        }
      })
    }
    
    // Sort by time (newest first)
    return traffic.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  }, [activeTab, filterText, showOnlyErrors])

  // Check if we have any traffic at all (before filtering)
  const hasAnyTraffic = activeTab ? (activeTab.searches.length > 0 || activeTab.events.length > 0) : false

  const toggleRow = (itemId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedRows(newExpanded)
  }

  const clearFilters = () => {
    setFilterText('')
    setShowOnlyErrors(false)
  }

  const hasActiveFilters = filterText || showOnlyErrors

  // Render empty state if no active tab
  if (!activeTab) {
    return (
      <div className="empty-state">
        <Search className="empty-state-icon" />
        <p className="empty-state-title">No active tab found</p>
        <p className="empty-state-subtitle">Please refresh the DevTools panel</p>
      </div>
    )
  }

  // Render empty state if no traffic detected
  if (!hasAnyTraffic) {
    return (
      <div className="empty-state">
        <Search className="empty-state-icon" />
        <p className="empty-state-title">No traffic detected yet</p>
        <p className="empty-state-subtitle">Start capturing to see Algolia search queries and events</p>
      </div>
    )
  }

  return (
    <div className="live-traffic">
      <div className="traffic-header">
        <div className="header-left">
          <h2 className="traffic-title">Live Traffic</h2>
          <p className="traffic-subtitle">
            {filteredTraffic.length} of {activeTab.searches.length + activeTab.events.length} requests
            {hasActiveFilters && ' (filtered)'}
          </p>
        </div>
        
        <div className="header-controls">
          <div className="filter-controls">
            <div className="search-box">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Filter by index, query ID, or user token..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="filter-input"
              />
              {filterText && (
                <button
                  onClick={() => setFilterText('')}
                  className="clear-filter-btn"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            
            <button
              onClick={() => setShowOnlyErrors(!showOnlyErrors)}
              className={`filter-btn ${showOnlyErrors ? 'active' : ''}`}
            >
              <AlertTriangle className="w-3 h-3" />
              Errors Only
            </button>
            
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="clear-all-btn"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>
      
      {filteredTraffic.length === 0 ? (
        <div className="empty-state">
          <Filter className="empty-state-icon" />
          <p className="empty-state-title">No matching traffic</p>
          <p className="empty-state-subtitle">
            Try adjusting your filters or check if traffic is being captured
          </p>
        </div>
      ) : (
        <div className="traffic-table">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>Type</th>
                <th>Index</th>
                <th>Query/Event Type</th>
                <th>Query ID</th>
                <th>User Token</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {filteredTraffic.map((item) => {
                // Check if this is part of a multi-query batch
                const isMultiQuery = 'appId' in item && item.isMultiRequest && item.batchId
                const isFirstInBatch = Boolean(isMultiQuery && item.requestIndex === 0)
                const isLastInBatch = Boolean(isMultiQuery && item.requestIndex === (item.totalRequests! - 1))
                const isMiddleInBatch = Boolean(isMultiQuery && !isFirstInBatch && !isLastInBatch)
                
                // Find other rows in the same batch for visual grouping
                const batchRows = isMultiQuery ? 
                  filteredTraffic.filter(otherItem => 
                    'appId' in otherItem && 
                    otherItem.batchId === item.batchId
                  ) : []
                
                return (
                  <React.Fragment key={item.id}>
                    <tr 
                      className={`expandable-row ${getRowStatusClass(item)} ${getMultiQueryRowClass(item, isFirstInBatch, isLastInBatch, isMiddleInBatch)}`}
                      onClick={() => toggleRow(item.id)}
                      data-batch-id={isMultiQuery ? item.batchId : undefined}
                    >
                      <td className="multi-query-indicator">
                        {isMultiQuery && (
                          <div className="batch-connector">
                            {isFirstInBatch && <div className="connector-start" />}
                            {isMiddleInBatch && <div className="connector-middle" />}
                            {isLastInBatch && <div className="connector-end" />}
                            {!isFirstInBatch && !isLastInBatch && <div className="connector-line" />}
                          </div>
                        )}
                        <button className={`expand-button ${expandedRows.has(item.id) ? 'expanded' : ''}`}>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                      <td>
                        {getTypeBadge(item)}
                      </td>
                      <td>
                        {getIndexDisplay(item)}
                      </td>
                      <td>
                        {getQueryOrEventTypeDisplay(item)}
                      </td>
                      <td className="mono">
                        {getQueryIdDisplay(item)}
                      </td>
                      <td className="mono">
                        {getUserTokenDisplay(item)}
                      </td>
                      <td className="muted">
                        {getTimeDisplay(item.time)}
                      </td>
                      <td>
                        {getStatusDisplay(item)}
                      </td>
                    </tr>
                    {expandedRows.has(item.id) && (
                      <tr className={`detail-row ${getMultiQueryRowClass(item, isFirstInBatch, isLastInBatch, isMiddleInBatch)}`}>
                        <td colSpan={8} style={{ padding: 0 }}>
                          <DetailPanel item={item} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function getTypeBadge(item: TrafficItem) {
  if ('appId' in item) {
    if (item.isMultiRequest && item.totalRequests && item.requestIndex !== undefined) {
      return (
        <span className="badge badge-blue">
          <Search className="w-3 h-3" />
          Multi-Search ({item.requestIndex + 1}/{item.totalRequests})
        </span>
      )
    } else {
      return (
        <span className="badge badge-blue">
          <Search className="w-3 h-3" />
          Search
        </span>
      )
    }
  } else {
    return (
      <span className="badge badge-orange">
        <AlertTriangle className="w-3 h-3" />
        Event
      </span>
    )
  }
}

function getIndexDisplay(item: TrafficItem) {
  if ('appId' in item) {
    return Array.isArray(item.indices) ? item.indices.join(', ') : String(item.indices || 'unknown')
  } else {
    return String(item.index || 'unknown')
  }
}

function getQueryOrEventTypeDisplay(item: TrafficItem) {
  if ('appId' in item) {
    // For search requests, show the actual query if available
    if (item.params) {
      try {
        const params = JSON.parse(item.params)
        if (params.query) {
          return params.query.length > 30 ? params.query.substring(0, 30) + '...' : params.query
        }
      } catch {
        // If parsing fails, show a truncated version of params
        return item.params.length > 30 ? item.params.substring(0, 30) + '...' : item.params
      }
    }
    return 'Search'
  } else {
    // For events, show the event type prominently
    return item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : 'Event'
  }
}

function getQueryIdDisplay(item: TrafficItem) {
  if ('queryId' in item) {
    return item.queryId || 'missing'
  }
  return 'N/A'
}

function getUserTokenDisplay(item: TrafficItem) {
  if ('userToken' in item) {
    return item.userToken || 'missing'
  }
  return 'N/A'
}

function getTimeDisplay(time: string) {
  const date = new Date(time)
  return date.toLocaleTimeString()
}

function getStatusDisplay(item: TrafficItem) {
  if ('appId' in item) {
    if (item.queryId) {
      return (
        <span className="badge badge-green">
          Valid
        </span>
      )
    } else {
      return (
        <span className="badge badge-red">
          Missing Query ID
        </span>
      )
    }
  } else {
    if (item.userToken) {
      return (
        <span className="badge badge-green">
          Valid
        </span>
      )
    } else {
      return (
        <span className="badge badge-red">
          Missing User Token
        </span>
      )
    }
  }
}

function getRowStatusClass(item: TrafficItem): string {
  if ('appId' in item) {
    return item.queryId ? 'row-valid' : 'row-error'
  } else {
    return item.userToken ? 'row-valid' : 'row-error'
  }
}

function getMultiQueryRowClass(item: TrafficItem, isFirstInBatch: boolean, isLastInBatch: boolean, isMiddleInBatch: boolean): string {
  if ('appId' in item && item.isMultiRequest) {
    if (isFirstInBatch) {
      return 'multi-query-first'
    } else if (isLastInBatch) {
      return 'multi-query-last'
    } else if (isMiddleInBatch) {
      return 'multi-query-middle'
    }
  }
  return ''
}
