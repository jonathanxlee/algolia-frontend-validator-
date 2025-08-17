/**
 * Efficient traffic helper functions using Map-based lookups
 * Provides O(1) event lookup performance instead of O(n²) filtering
 */

import type { SearchRequest, InsightsRequest, InsightsEvent } from '../types'

/**
 * Creates an efficient index of events by queryID for fast lookups
 * O(n) one-time cost, then O(1) lookups
 */
export const createEventIndex = (events: InsightsRequest[]) => {
  const eventMap = new Map<string, InsightsRequest[]>()
  
  events.forEach(insights => {
    insights.events.forEach(event => {
      if (event.queryID) {
        if (!eventMap.has(event.queryID)) {
          eventMap.set(event.queryID, [])
        }
        eventMap.get(event.queryID)!.push(insights)
      }
    })
  })
  
  return eventMap
}

/**
 * Fast event lookup using pre-built index
 * O(1) complexity instead of O(n²)
 */
export const findRelatedEventsFast = (
  search: SearchRequest, 
  eventIndex: Map<string, InsightsRequest[]>
) => {
  const relatedEvents: InsightsRequest[] = []
  
  // Extract all queryIDs from this search
  const queryIds = search.queries
    .map(q => q.queryID)
    .filter(Boolean) as string[]
  
  // O(1) lookup for each queryID
  queryIds.forEach(queryId => {
    const events = eventIndex.get(queryId)
    if (events) {
      relatedEvents.push(...events)
    }
  })
  
  // Remove duplicates (same request)
  return [...new Map(relatedEvents.map(e => [e.url + e.ts, e])).values()]
}

/**
 * Flattens all events into individual items for the Events tab
 * Sorts by timestamp (newest first)
 */
export const flattenAllEvents = (allEvents: InsightsRequest[]) => {
  return allEvents.flatMap(insights => 
    insights.events.map(event => ({
      ...event,
      requestTime: insights.ts,
      requestUrl: insights.url,
      requestHeaders: insights.headers
    }))
  ).sort((a, b) => new Date(b.requestTime).getTime() - new Date(a.requestTime).getTime())
}

/**
 * Counts events by type for display purposes
 */
export const countEventsByType = (events: InsightsRequest[]) => {
  const counts = new Map<string, number>()
  
  events.forEach(insights => {
    insights.events.forEach(event => {
      const type = event.eventType || 'unknown'
      counts.set(type, (counts.get(type) || 0) + 1)
    })
  })
  
  return counts
}
