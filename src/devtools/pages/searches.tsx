import React, { useMemo } from 'react'
import { Search } from 'lucide-react'
import { useAppStore } from '../../store'
import { SearchCard } from '../components/search-card'

export function Searches() {
  const { activeTabId, tabs } = useAppStore()
  const activeTab = activeTabId ? tabs[activeTabId] : null
  
  // Create search cards with related events using the efficient event index
  // Sort searches by timestamp (newest first)
  const searchCards = useMemo(() => {
    if (!activeTab) return []
    
    return activeTab.searches
      .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
      .map((search, index) => ({
        search,
        eventIndex: activeTab.eventIndex
      }))
  }, [activeTab?.searches, activeTab?.eventIndex])

  // Check if we have any traffic at all
  const hasAnyTraffic = activeTab ? (activeTab.searches.length > 0 || activeTab.events.length > 0) : false

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
    <div className="searches">
      <div className="searches-header">
        <div className="header-left">
          <h2 className="searches-title">Searches</h2>
          <p className="searches-subtitle">
            {activeTab.searches.length} search requests with related events
          </p>
        </div>
      </div>
      
      {activeTab.searches.length === 0 ? (
        <div className="empty-state">
          <Search className="empty-state-icon" />
          <p className="empty-state-title">No searches detected</p>
          <p className="empty-state-subtitle">
            Start capturing to see Algolia search queries
          </p>
        </div>
      ) : (
        <div className="search-cards">
          {searchCards.map((item, index) => (
            <SearchCard
              key={`search-${item.search.ts}-${index}`}
              search={item.search}
              eventIndex={item.eventIndex}
            />
          ))}
        </div>
      )}
    </div>
  )
}
