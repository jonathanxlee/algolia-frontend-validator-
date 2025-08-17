import React, { useMemo } from 'react'
import { Activity } from 'lucide-react'
import { useAppStore } from '../../store'
import { EventCard } from '../components/event-card'
import { flattenAllEvents } from '../utils/traffic-helpers'

export function Events() {
  const { activeTabId, tabs } = useAppStore()
  const activeTab = activeTabId ? tabs[activeTabId] : null
  
  // Flatten all events into individual items for display
  const allEvents = useMemo(() => {
    if (!activeTab) return []
    return flattenAllEvents(activeTab.events)
  }, [activeTab?.events])

  // Check if we have any traffic at all
  const hasAnyTraffic = activeTab ? (activeTab.searches.length > 0 || activeTab.events.length > 0) : false

  // Render empty state if no active tab
  if (!activeTab) {
    return (
      <div className="empty-state">
        <Activity className="empty-state-icon" />
        <p className="empty-state-title">No active tab found</p>
        <p className="empty-state-subtitle">Please refresh the DevTools panel</p>
      </div>
    )
  }

  // Render empty state if no traffic detected
  if (!hasAnyTraffic) {
    return (
      <div className="empty-state">
        <Activity className="empty-state-icon" />
        <p className="empty-state-title">No traffic detected yet</p>
        <p className="empty-state-subtitle">Start capturing to see Algolia insights events</p>
      </div>
    )
  }

  return (
    <div className="events">
      <div className="events-header">
        <div className="header-left">
          <h2 className="events-title">Events</h2>
          <p className="events-subtitle">
            {allEvents.length} individual events from all insights requests
          </p>
        </div>
      </div>
      
      {allEvents.length === 0 ? (
        <div className="empty-state">
          <Activity className="empty-state-icon" />
          <p className="empty-state-title">No events detected</p>
          <p className="empty-state-subtitle">
            Start capturing to see Algolia insights events
          </p>
        </div>
      ) : (
        <div className="event-cards">
          {allEvents.map((event, index) => (
            <EventCard
              key={event.id || `event-${index}`}
              event={event}
            />
          ))}
        </div>
      )}
    </div>
  )
}
