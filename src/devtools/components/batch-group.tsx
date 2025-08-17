import React from 'react'
import { BatchHeader } from './batch-header'
import { SearchCard } from './search-card'
import { EventCard } from './event-card'
import type { GroupedTrafficItem } from '../utils/traffic-grouping'
import type { SearchRequest, InsightsEvent } from '../types'

interface BatchGroupProps {
  batchId: string
  count: number
  items: GroupedTrafficItem[]
  expandedRows: Set<string>
  onToggle: (id: string) => void
}

export function BatchGroup({ batchId, count, items, expandedRows, onToggle }: BatchGroupProps) {
  return (
    <div className="batch-group">
      <BatchHeader batchId={batchId} count={count} level={0} />
      <div className="batch-items">
        {items.map((item, index) => {
          // Create unique keys for each item
          const itemKey = item.type === 'search' 
            ? `search-${(item.item as any).ts}-${(item.item as any).url}`
            : item.type === 'event'
            ? `event-${(item.item as any).id}`
            : `item-${index}`
          
          if (item.type === 'search') {
            return (
              <SearchCard 
                key={itemKey}
                search={item.item as SearchRequest} 
                isExpanded={expandedRows.has(itemKey)}
                onToggle={() => onToggle(itemKey)}
                level={item.level}
                batchId={item.batchId}
                isLastInGroup={item.isLastInGroup}
                hasChildren={item.hasChildren}
              />
            )
          } else if (item.type === 'event') {
            return (
              <EventCard 
                key={itemKey}
                event={item.item as InsightsEvent} 
                isExpanded={expandedRows.has(itemKey)}
                onToggle={() => onToggle(itemKey)}
                level={item.level}
                parentQueryId={item.parentQueryId}
                batchId={item.batchId}
                isLastInGroup={item.isLastInGroup}
              />
            )
          }
          return null
        })}
      </div>
    </div>
  )
}
