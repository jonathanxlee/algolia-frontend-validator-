/**
 * Traffic grouping utilities for organizing searches and events into hierarchical display
 * Updated to work with new nested schema structure
 */

import type { SearchRequest, InsightsRequest, SearchQuery, InsightsEvent } from '../types'

export interface GroupedTrafficItem {
  item: SearchRequest | InsightsRequest | InsightsEvent | { batchId: string; count: number }
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
 * Now works with nested schema structure for much simpler logic
 */
export function groupTrafficByQueryId(searches: SearchRequest[], events: InsightsRequest[]): GroupedTrafficItem[] {
  const result: GroupedTrafficItem[] = []
  
  // Sort searches by timestamp (newest first)
  const sortedSearches = searches.sort((a, b) => 
    new Date(b.ts).getTime() - new Date(a.ts).getTime()
  )
  
  debugger;
  // Process each search
  sortedSearches.forEach((search, searchIndex) => {
    // Check if this search has multiple queries (multi-query request)
    const hasMultipleQueries = search.queries.length > 1
    
    if (hasMultipleQueries) {
      // Add batch header for multi-query searches
      const batchId = `batch_${searchIndex}`
      result.push({
        item: { 
          batchId, 
          count: search.queries.length 
        },
        type: 'batch-header',
        level: 0,
        batchId,
        isLastInGroup: false,
        hasChildren: true
      })
      
      debugger;
      // Process each query in THIS search (not mixing with other searches)
      search.queries.forEach((query, queryIndex) => {
        // Find associated events for this specific query
        const associatedEvents = query.queryID ? 
          events.flatMap(event => 
            event.events.filter(eventItem => eventItem.queryID === query.queryID)
          ) : []
        
        const hasChildren = associatedEvents.length > 0
        
        // Add the search item (representing this specific query)
        result.push({
          item: {
            ...search,
            // Override queries to show only this specific query
            queries: [query]
          },
          type: 'search',
          level: 1, // Nested under batch header
          batchId,
          isLastInGroup: !hasChildren,
          hasChildren
        })
        
        // Add associated events in sorted order (newest first)
        if (query.queryID && associatedEvents.length > 0) {
          const sortedEvents = associatedEvents.sort((a, b) => 
            new Date(b.eventTs || search.ts).getTime() - new Date(a.eventTs || search.ts).getTime()
          )
          
          sortedEvents.forEach((event, eventIndex) => {
            const isLastEvent = eventIndex === sortedEvents.length - 1
            result.push({
              item: event, // Use the individual event
              type: 'event',
              level: 2, // Nested under search within batch
              parentQueryId: query.queryID,
              batchId,
              isLastInGroup: isLastEvent,
              hasChildren: false
            })
          })
        }
      })
    } else {
      // Single query search
      const query = search.queries[0]
      
      // Find associated events for this query
      const associatedEvents = query.queryID ? 
        events.flatMap(event => 
          event.events.filter(eventItem => eventItem.queryID === query.queryID)
        ) : []
      
      const hasChildren = associatedEvents.length > 0
      
      // Add the search item
      result.push({
        item: search,
        type: 'search',
        level: 0,
        batchId: null,
        isLastInGroup: !hasChildren,
        hasChildren
      })
      
      // Add associated events in sorted order (newest first)
      if (query.queryID && associatedEvents.length > 0) {
        const sortedEvents = associatedEvents.sort((a, b) => 
          new Date(b.eventTs || search.ts).getTime() - new Date(a.eventTs || search.ts).getTime()
        )
        
        sortedEvents.forEach((event, eventIndex) => {
          const isLastEvent = eventIndex === sortedEvents.length - 1
          result.push({
            item: event,
            type: 'event',
            level: 1, // Nested under search
            parentQueryId: query.queryID,
            batchId: null,
            isLastInGroup: isLastEvent,
            hasChildren: false
          })
        })
      }
    }
  })
  
  // Add unlinked events (events without QueryID or with QueryID that doesn't match any search)
  const linkedEventIds = new Set<string>()
  searches.forEach(search => {
    search.queries.forEach(query => {
      if (query.queryID) {
        events.forEach(event => {
          event.events.forEach(eventItem => {
            if (eventItem.queryID === query.queryID) {
              linkedEventIds.add(eventItem.id)
            }
          })
        })
      }
    })
  })
  
  const unlinkedEvents = events.flatMap(event => 
    event.events.filter(eventItem => !linkedEventIds.has(eventItem.id))
  )
  
  // Sort unlinked events by time (newest first)
  const sortedUnlinkedEvents = unlinkedEvents.sort((a, b) => 
    new Date(b.eventTs || '1970-01-01').getTime() - new Date(a.eventTs || '1970-01-01').getTime()
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
