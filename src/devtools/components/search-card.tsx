import React, { useState } from 'react'
import { Search, ChevronDown, ChevronRight } from 'lucide-react'
import type { SearchRequest, InsightsRequest } from '../types'
import { findRelatedEventsFast } from '../utils/traffic-helpers'

interface SearchCardProps {
  search: SearchRequest
  eventIndex: Map<string, InsightsRequest[]>
}

export function SearchCard({ search, eventIndex }: SearchCardProps) {
  // Get primary query info for display
  const primaryQuery = search.queries[0]
  const isMultiRequest = search.queries.length > 1
  
  // Find related events using the fast Map lookup
  const relatedEvents = findRelatedEventsFast(search, eventIndex)
  
  // Count events by type
  const eventCounts = relatedEvents.reduce((acc, insights) => {
    insights.events.forEach(event => {
      const type = event.eventType || 'unknown'
      acc[type] = (acc[type] || 0) + 1
    })
    return acc
  }, {} as Record<string, number>)
  
  // Auto-expand if there are related events
  const [isExpanded, setIsExpanded] = useState(relatedEvents.length > 0)
  
  // Tab management
  const [activeTab, setActiveTab] = useState<'events' | 'properties'>('events')

  const toggleExpanded = () => setIsExpanded(!isExpanded)

  return (
    <div className="search-card">
      <div className="card-header" onClick={toggleExpanded}>
        <div className="card-content">
          {/* Multi-Query Header Indicator with Icon */}
          <div className="search-type-header">
            <div className="header-icon-container">
              <Search size={16} />
            </div>
            <span>
              {isMultiRequest ? 
                `Multi-Query Search (${search.queries.length} queries)` : 
                'Search Query'
              }
            </span>
          </div>

          {/* Individual Queries Carousel - Always Visible */}
          <div className="queries-carousel">
            {search.queries.map((query, index) => (
              <div key={index} className="query-carousel-item">
                <div className="query-carousel-content">
                  <div className="query-property">
                    <span className="property-label">Query:</span>
                    <span className="property-value">
                      {query.params ? 
                        new URLSearchParams(query.params).get('query') || 'No query text' :
                        'No query text'
                      }
                    </span>
                  </div>
                  <div className="query-property">
                    <span className="property-label">Index:</span>
                    <span className="property-value">{query.index}</span>
                  </div>
                  {query.queryID && (
                    <div className="query-property">
                      <span className="property-label">QueryID:</span>
                      <span className="property-value">{query.queryID}</span>
                    </div>
                  )}
                  {query.userToken && (
                    <div className="query-property">
                      <span className="property-label">UserToken:</span>
                      <span className="property-value">{query.userToken}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="card-details">
            <span className="time">
              {new Date(search.ts).toLocaleTimeString()}
            </span>
          </div>
          
          {/* Event counters - prominently displayed */}
          {(eventCounts.click > 0 || eventCounts.conversion > 0 || eventCounts.view > 0) && (
            <div className="event-counters">
              {eventCounts.click > 0 && (
                <span className="event-counter click">
                  {eventCounts.click} click{eventCounts.click !== 1 ? 's' : ''}
                </span>
              )}
              {eventCounts.conversion > 0 && (
                <span className="event-counter conversion">
                  {eventCounts.conversion} conversion{eventCounts.conversion !== 1 ? 's' : ''}
                </span>
              )}
              {eventCounts.view > 0 && (
                <span className="event-counter view">
                  {eventCounts.view} view{eventCounts.view !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className="card-toggle">
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </div>
      
      {isExpanded && (
        <div className="card-details-panel">
          {/* Tab Navigation */}
          <div className="dropdown-tabs">
            <button 
              className={`tab-button ${activeTab === 'events' ? 'active' : ''}`}
              onClick={() => setActiveTab('events')}
            >
              Events Details
            </button>
            <button 
              className={`tab-button ${activeTab === 'properties' ? 'active' : ''}`}
              onClick={() => setActiveTab('properties')}
            >
              Additional Properties
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'events' && (
            <div className="tab-content">
              {relatedEvents.length > 0 ? (
                <div className="events-table">
                  <h4 className="section-title">Event Details</h4>
                  <table>
                    <thead>
                      <tr>
                        <th>Event Type</th>
                        <th>Event Name</th>
                        <th>Object IDs</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatedEvents.flatMap(insights => 
                        insights.events.map(event => (
                          <tr key={event.id}>
                            <td>{event.eventType}</td>
                            <td>{event.eventName}</td>
                            <td>{event.objectIDs.join(', ')}</td>
                            <td>
                              {new Date(event.eventTs || insights.ts).toLocaleTimeString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="no-events">
                  <p>No related events found for this search</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'properties' && (
            <div className="tab-content">
              <div className="properties-section">
                <h4 className="section-title">Request Properties</h4>
                
                <div className="property-grid">
                  <div className="property-item">
                    <label>URL:</label>
                    <span className="property-value">{search.url}</span>
                  </div>
                  
                  <div className="property-item">
                    <label>Timestamp:</label>
                    <span className="property-value">
                      {new Date(search.ts).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="property-item">
                    <label>Query Count:</label>
                    <span className="property-value">{search.queries.length}</span>
                  </div>
                  
                  <div className="property-item full-width">
                    <label>Request Body:</label>
                    <pre className="property-value json">
                      {JSON.stringify(search.queries, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
