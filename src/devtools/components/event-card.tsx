import React, { useState } from 'react'
import { MousePointer, Eye, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react'
import type { InsightsEvent } from '../types'

interface EventCardProps {
  event: InsightsEvent & {
    requestTime: string
    requestUrl: string
    requestHeaders: Record<string, string>
  }
}

export function EventCard({ event }: EventCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'click':
        return <MousePointer size={16} />
      case 'view':
        return <Eye size={16} />
      case 'conversion':
        return <TrendingUp size={16} />
      default:
        return <MousePointer size={16} />
    }
  }

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'click':
        return '#3b82f6' // blue
      case 'view':
        return '#6b7280' // gray
      case 'conversion':
        return '#10b981' // green
      default:
        return '#6b7280'
    }
  }

  const toggleExpanded = () => setIsExpanded(!isExpanded)

  return (
    <div className="event-card">
      <div className="card-header" onClick={toggleExpanded}>
        <div className="card-content">
          <div className="card-title">
            <div className="title-with-icon">
              <div className="header-icon-container" style={{ backgroundColor: getEventColor(event.eventType) }}>
                {getEventIcon(event.eventType)}
              </div>
              <span className="event-type" style={{ color: getEventColor(event.eventType) }}>
                {event.eventType.toUpperCase()}
              </span>
              <span className="event-name">{event.eventName}</span>
            </div>
          </div>
          
          <div className="card-details">
            <span className="index-name">{event.index}</span>
            {event.queryID && (
              <span className="query-id">Query ID: {event.queryID}</span>
            )}
            {event.userToken && (
              <span className="user-token">User: {event.userToken}</span>
            )}
            <span className="time">
              {new Date(event.requestTime).toLocaleTimeString()}
            </span>
          </div>
        </div>
        
        <div className="card-toggle">
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </div>
      
      {isExpanded && (
        <div className="card-details-panel">
          <div className="event-details">
            <div className="detail-row">
              <strong>Object IDs:</strong>
              <span>{event.objectIDs.join(', ')}</span>
            </div>
            
            {event.positions && event.positions.length > 0 && (
              <div className="detail-row">
                <strong>Positions:</strong>
                <span>{event.positions.join(', ')}</span>
              </div>
            )}
            
            <div className="detail-row">
              <strong>Request URL:</strong>
              <span className="url">{event.requestUrl}</span>
            </div>
            
            <div className="detail-row">
              <strong>Event Time:</strong>
              <span>{new Date(event.eventTs || event.requestTime).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
