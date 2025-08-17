import React from 'react'
import { useAppStore } from '../../store'
import { countEventsByType } from '../utils/traffic-helpers'

interface NavigationProps {
  currentView: string
  onViewChange: (view: string) => void
}

export function Navigation({ currentView, onViewChange }: NavigationProps) {
  const { activeTabId, tabs } = useAppStore()
  const activeTab = activeTabId ? tabs[activeTabId] : null
  
  // Get counts for display
  const searchCount = activeTab?.searches.length || 0
  const eventCount = activeTab?.events.length || 0
  
  // Count specific event types for the searches tab
  const eventTypeCounts = activeTab ? countEventsByType(activeTab.events) : new Map()
  const clickCount = eventTypeCounts.get('click') || 0
  const conversionCount = eventTypeCounts.get('conversion') || 0

  const tabsWithCounts = [
    { 
      id: 'searches', 
      label: 'Searches', 
      count: searchCount,
      subtitle: clickCount > 0 || conversionCount > 0 ? `${clickCount} clicks, ${conversionCount} conversions` : undefined
    },
    { 
      id: 'events', 
      label: 'Events', 
      count: eventCount 
    },
    { id: 'issues', label: 'Issues' },
    { id: 'expectations', label: 'Expectations' },
    { id: 'settings', label: 'Settings' }
  ]

  return (
    <div className="navigation">
      <div className="nav-tabs">
        {tabsWithCounts.map(tab => (
          <button
            key={tab.id}
            onClick={() => onViewChange(tab.id)}
            className={`nav-tab ${currentView === tab.id ? 'active' : ''}`}
          >
            <div className="tab-content">
              <span className="tab-label">{tab.label}</span>
              {tab.count !== undefined && (
                <span className="tab-count">{tab.count}</span>
              )}
              {tab.subtitle && (
                <span className="tab-subtitle">{tab.subtitle}</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
