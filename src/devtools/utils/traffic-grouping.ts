/**
 * Traffic grouping utilities for organizing searches and events into hierarchical display
 */

export interface GroupedTrafficItem {
  item: any
  type: 'search' | 'event' | 'batch-header'
  level: number
  parentQueryId?: string | null
  batchId?: string | null
  isLastInGroup: boolean
  hasChildren: boolean
}

/**
 * Groups traffic items by QueryID to create hierarchy
 * Searches are sorted newest first, events are nested under their parent searches
 */
export function groupTrafficByQueryId(searches: any[], events: any[]): GroupedTrafficItem[] {
  const result: GroupedTrafficItem[] = []
  
  // Group searches by batch ID
  const batchGroups = new Map<string, any[]>()
  const singleSearches: any[] = []
  
  searches.forEach(search => {
    if (search.batchId && search.isMultiRequest) {
      if (!batchGroups.has(search.batchId)) {
        batchGroups.set(search.batchId, [])
      }
      batchGroups.get(search.batchId)!.push(search)
    } else {
      singleSearches.push(search)
    }
  })
  
  // Sort single searches by time (newest first)
  console.log('[DEBUG] Single searches before sorting:', singleSearches.map(s => ({ id: s.id, time: s.time, parsed: new Date(s.time) })))
  const sortedSingleSearches = singleSearches.sort((a, b) => 
    new Date(b.time).getTime() - new Date(a.time).getTime()
  )
  console.log('[DEBUG] Single searches after sorting:', sortedSingleSearches.map(s => ({ id: s.id, time: s.time, parsed: new Date(s.time) })))
  
  // Process batch groups first (they should come before single searches)
  batchGroups.forEach((batchSearches, batchId) => {
    // Sort batch searches by time (newest first)
    const sortedBatchSearches = batchSearches.sort((a, b) => 
      new Date(b.time).getTime() - new Date(a.time).getTime()
    )
    
    // Add batch header
    result.push({
      item: { batchId, count: batchSearches.length },
      type: 'batch-header',
      level: 0,
      batchId,
      isLastInGroup: false,
      hasChildren: true
    })
    
    // Process each search in the batch
    sortedBatchSearches.forEach((search, index) => {
      // Find associated events for this search
      const associatedEvents = search.queryId ? 
        events.filter(event => event.queryId === search.queryId) : []
      const hasChildren = associatedEvents.length > 0
      
      // Sort associated events by time (newest first)
      const sortedEvents = associatedEvents.sort((a, b) => 
        new Date(b.time).getTime() - new Date(a.time).getTime()
      )
      
      // Add the search item
      result.push({
        item: search,
        type: 'search',
        level: 1, // Nested under batch header
        batchId: search.batchId,
        isLastInGroup: !hasChildren,
        hasChildren
      })
      
      // Add associated events in sorted order
      if (search.queryId) {
        sortedEvents.forEach((event, eventIndex) => {
          const isLastEvent = eventIndex === sortedEvents.length - 1
          result.push({
            item: event,
            type: 'event',
            level: 2, // Nested under search within batch
            parentQueryId: search.queryId,
            batchId: search.batchId,
            isLastInGroup: isLastEvent,
            hasChildren: false
          })
        })
      }
    })
  })
  
  // Process single searches after batch groups
  sortedSingleSearches.forEach(search => {
    // Find associated events for this search
    const associatedEvents = search.queryId ? 
      events.filter(event => event.queryId === search.queryId) : []
    const hasChildren = associatedEvents.length > 0
    
    // Sort associated events by time (newest first)
    const sortedEvents = associatedEvents.sort((a, b) => 
      new Date(b.time).getTime() - new Date(a.time).getTime()
    )
    
    // Add the search item
    result.push({
      item: search,
      type: 'search',
      level: 0,
      batchId: search.batchId,
      isLastInGroup: !hasChildren,
      hasChildren
    })
    
    // Add associated events in sorted order
    if (search.queryId) {
      sortedEvents.forEach((event, index) => {
        const isLastEvent = index === sortedEvents.length - 1
        result.push({
          item: event,
          type: 'event',
          level: 1, // Nested under search
          parentQueryId: search.queryId,
          batchId: search.batchId,
          isLastInGroup: isLastEvent,
          hasChildren: false
        })
      })
    }
  })
  
  // Add unlinked events (events without QueryID or with QueryID that doesn't match any search)
  const linkedEventIds = new Set()
  searches.forEach(search => {
    if (search.queryId) {
      events.forEach(event => {
        if (event.queryId === search.queryId) {
          linkedEventIds.add(event.id)
        }
      })
    }
  })
  
  const unlinkedEvents = events.filter(event => !linkedEventIds.has(event.id))
  // Sort unlinked events by time (newest first)
  const sortedUnlinkedEvents = unlinkedEvents.sort((a, b) => 
    new Date(b.time).getTime() - new Date(a.time).getTime()
  )
  
  sortedUnlinkedEvents.forEach(event => {
    result.push({
      item: event,
      type: 'event',
      level: 0, // Top level since no parent
      parentQueryId: null,
      batchId: null,
      isLastInGroup: true,
      hasChildren: false
    })
  })
  
  return result
}
