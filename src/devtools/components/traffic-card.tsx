import React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { SearchCard } from './search-card'
import { EventCard } from './event-card'
import { BatchHeader } from './batch-header'
import type { GroupedTrafficItem } from '../utils/traffic-grouping'

interface TrafficCardProps {
  item: GroupedTrafficItem
  isExpanded: boolean
  onToggle: () => void
}

export function TrafficCard({ item, isExpanded, onToggle }: TrafficCardProps) {
  if (item.type === 'batch-header') {
    return (
      <BatchHeader 
        batchId={item.item.batchId}
        count={item.item.count}
        level={item.level}
      />
    )
  } else if (item.type === 'search') {
    return (
      <SearchCard 
        search={item.item} 
        isExpanded={isExpanded}
        onToggle={onToggle}
        level={item.level}
        batchId={item.batchId}
        isLastInGroup={item.isLastInGroup}
        hasChildren={item.hasChildren}
      />
    )
  } else {
    return (
      <EventCard 
        event={item.item} 
        isExpanded={isExpanded}
        onToggle={onToggle}
        level={item.level}
        parentQueryId={item.parentQueryId}
        batchId={item.batchId}
        isLastInGroup={item.isLastInGroup}
      />
    )
  }
}
