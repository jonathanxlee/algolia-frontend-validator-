import React from 'react'
import { BatchHeader } from './batch-header'
import { SearchCard } from './search-card'
import { EventCard } from './event-card'
import type { GroupedTrafficItem } from '../utils/traffic-grouping'

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
        {items.map((item) => {
          if (item.type === 'search') {
            return (
              <SearchCard 
                key={item.item.id}
                search={item.item} 
                isExpanded={expandedRows.has(item.item.id)}
                onToggle={() => onToggle(item.item.id)}
                level={item.level}
                batchId={item.batchId}
                isLastInGroup={item.isLastInGroup}
                hasChildren={item.hasChildren}
              />
            )
          } else if (item.type === 'event') {
            return (
              <EventCard 
                key={item.item.id}
                event={item.item} 
                isExpanded={expandedRows.has(item.item.id)}
                onToggle={() => onToggle(item.item.id)}
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
