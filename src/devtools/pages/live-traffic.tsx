import React, { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { useAppStore } from '../../store'
import { groupTrafficByQueryId, type GroupedTrafficItem } from '../utils/traffic-grouping'
import { TrafficCard } from '../components/traffic-card'
import { BatchGroup } from '../components/batch-group'

export function LiveTraffic() {
  const { activeTabId, tabs } = useAppStore()
  const activeTab = activeTabId ? tabs[activeTabId] : null
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Group traffic items by QueryID to create hierarchy
  const groupedTraffic = useMemo(() => {
    if (!activeTab) return []
    return groupTrafficByQueryId(activeTab.searches, activeTab.events)
  }, [activeTab?.searches, activeTab?.events])

  // Filter the grouped traffic (no sorting needed)
  const filteredTraffic = useMemo(() => {
    let traffic = groupedTraffic
    
    // Filter out 'view' events by default
    traffic = traffic.filter(({ item, type }) => {
      if (type === 'event' && 'eventType' in item && item.eventType === 'view') {
        return false
      }
      return true
    })
    
    // No sorting needed - hierarchy is already maintained from groupedTraffic
    return traffic
  }, [groupedTraffic])

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

  // Helper function to generate a unique key for an item
  const generateItemKey = (item: GroupedTrafficItem, index: number): string => {
    if (item.type === 'search') {
      const search = item.item as any
      return `search-${search.ts}-${search.url}`
    }
    if (item.type === 'event') {
      const event = item.item as any
      return `event-${event.id}`
    }
    if (item.type === 'batch-header') {
      const header = item.item as any
      return `batch-${header.batchId}`
    }
    return `item-${index}`
  }

  // Main function to render all traffic items
  const renderTrafficItems = (): React.ReactNode[] => {
    const items: React.ReactNode[] = []
    let currentIndex = 0

    while (currentIndex < filteredTraffic.length) {
      const currentItem = filteredTraffic[currentIndex]

      if (currentItem.type === 'batch-header') {
        // Handle batch group - collect all items that belong to this batch
        const header = currentItem.item as { batchId: string; count: number }
        const batchItems: GroupedTrafficItem[] = []
        
        // Move to next item after header
        currentIndex++
        
        // Collect all items that belong to this batch (until we hit another batch header)
        while (currentIndex < filteredTraffic.length && 
               filteredTraffic[currentIndex].type !== 'batch-header' && 
               filteredTraffic[currentIndex].batchId === header.batchId) {
          batchItems.push(filteredTraffic[currentIndex])
          currentIndex++
        }

        // Render the batch group
        items.push(
          <BatchGroup
            key={`batch-${header.batchId}`}
            batchId={header.batchId}
            count={header.count}
            items={batchItems}
            expandedRows={expandedRows}
            onToggle={toggleRow}
          />
        )
      } else {
        // Handle individual item
        const itemKey = generateItemKey(currentItem, currentIndex)
        items.push(
          <TrafficCard
            key={itemKey}
            item={currentItem}
            isExpanded={expandedRows.has(itemKey)}
            onToggle={() => toggleRow(itemKey)}
          />
        )
        currentIndex++
      }
    }

    return items
  }

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
          </p>
        </div>
      </div>
      
      {filteredTraffic.length === 0 ? (
        <div className="empty-state">
          <Search className="empty-state-icon" />
          <p className="empty-state-title">No matching traffic</p>
          <p className="empty-state-subtitle">
            Try adjusting your filters or check if traffic is being captured
          </p>
        </div>
      ) : (
        <div className="traffic-cards">
          {renderTrafficItems()}
        </div>
      )}
    </div>
  )
}
