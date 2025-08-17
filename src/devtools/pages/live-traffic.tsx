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

  // Function to render traffic items with proper batch grouping
  const renderTrafficItems = () => {
    const items: React.ReactNode[] = []
    let i = 0
    
    while (i < filteredTraffic.length) {
      const item = filteredTraffic[i]
      
      if (item.type === 'batch-header') {
        // Collect all items in this batch
        const batchItems: GroupedTrafficItem[] = []
        let j = i + 1
        
        // Type guard for batch header
        if (item.type === 'batch-header' && 'batchId' in item.item && 'count' in item.item) {
          const batchHeader = item.item as { batchId: string; count: number }
          
          while (j < filteredTraffic.length && 
                 filteredTraffic[j].type !== 'batch-header' && 
                 filteredTraffic[j].batchId === batchHeader.batchId) {
            batchItems.push(filteredTraffic[j])
            j++
          }
          
          // Render batch group
          items.push(
            <BatchGroup
              key={`batch-${batchHeader.batchId}`}
              batchId={batchHeader.batchId}
              count={batchHeader.count}
              items={batchItems}
              expandedRows={expandedRows}
              onToggle={toggleRow}
            />
          )
        }
        
        i = j // Skip to after the batch
      } else {
        // Render individual item
        // Create a unique key for each item
        const itemKey = item.type === 'search' 
          ? `search-${(item.item as any).ts}-${(item.item as any).url}`
          : item.type === 'event'
          ? `event-${(item.item as any).id}`
          : `item-${i}`
        
        items.push(
          <TrafficCard
            key={itemKey}
            item={item}
            isExpanded={expandedRows.has(itemKey)}
            onToggle={() => toggleRow(itemKey)}
          />
        )
        i++
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
