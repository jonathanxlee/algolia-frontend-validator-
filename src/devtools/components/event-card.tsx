import React from 'react'
import { ChevronDown, ChevronRight, Activity } from 'lucide-react'
import type { InsightsEvent } from '../types'
import { DetailPanel } from '../pages/detail-panel'

interface EventCardProps {
  event: InsightsEvent
  isExpanded: boolean
  onToggle: () => void
  level: number
  parentQueryId?: string | null
  batchId?: string | null
  isLastInGroup: boolean
}

export function EventCard({ 
  event, 
  isExpanded, 
  onToggle, 
  level, 
  parentQueryId, 
  batchId, 
  isLastInGroup 
}: EventCardProps) {
  const hasQueryId = !!event.queryID
  const hasUserToken = !!event.userToken
  
  return (
    <div 
      className={`event-card level-${level}`}
      style={{ marginLeft: `${level * 20}px` }}
    >
      <div className="card-header" onClick={onToggle}>
        <div className="card-icon">
          <Activity className="w-4 h-4" />
        </div>
        
        <div className="card-content">
          <div className="card-title">
            <span className="event-type">
              {event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}
            </span>
            <span className="event-name">
              {event.eventName}
            </span>
            <span className="index-name">
              {event.index}
            </span>
          </div>
          
          <div className="card-details">
            <div className="event-details">
              <strong>{event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}</strong> "{event.eventName}"
            </div>
            {event.objectIDs && event.objectIDs.length > 0 && (
              <div className="event-objects">
                Object IDs: {event.objectIDs.slice(0, 3).join(', ')}
                {event.objectIDs.length > 3 && ` (+${event.objectIDs.length - 3} more)`}
              </div>
            )}
            <span className="query-id">
              Query ID: {hasQueryId ? event.queryID : 'missing'}
            </span>
            <span className="user-token">
              User Token: {hasUserToken ? event.userToken : 'missing'}
            </span>
            <span className="time">
              {new Date(event.eventTs || Date.now()).toLocaleTimeString()}
            </span>
          </div>
        </div>
        
        <div className="card-status">
          <span className={`status-badge ${hasQueryId ? 'valid' : 'missing'}`}>
            {hasQueryId ? 'Valid' : 'Missing Query ID'}
          </span>
        </div>
        
        <div className="card-toggle">
          <ChevronDown className="w-4 h-4" />
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
          <DetailPanel item={event} />
        </div>
      )}
    </div>
  )
}
