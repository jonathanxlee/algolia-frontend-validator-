/**
 * Tests for traffic grouping utilities
 * Updated to work with new nested schema structure
 */

import { groupTrafficByQueryId } from '../src/devtools/utils/traffic-grouping'
import type { SearchRequest, InsightsRequest } from '../src/devtools/types'

describe('groupTrafficByQueryId', () => {
  it('should group traffic with searches newest first and events nested underneath', () => {
    // Test data matching the new nested schema structure
    const searches: SearchRequest[] = [
      {
        type: 'search_request',
        ts: "2024-01-01T10:00:00Z",  // OLDEST
        url: "https://example.com/search1",
        method: "POST",
        appId: "test",
        requestHeaders: {},
        requestBody: "",
        responseStatus: 200,
        responseHeaders: {},
        responseBody: "",
        queries: [{
          id: "query1",
          index: "products",
          params: "query=shoes",
          queryID: "query123"
        }]
      },
      {
        type: 'search_request',
        ts: "2024-01-01T10:05:00Z",  // NEWER
        url: "https://example.com/search2",
        method: "POST",
        appId: "test",
        requestHeaders: {},
        requestBody: "",
        responseStatus: 200,
        responseHeaders: {},
        responseBody: "",
        queries: [{
          id: "query2",
          index: "products",
          params: "query=hats",
          queryID: "query456"
        }]
      },
      {
        type: 'search_request',
        ts: "2024-01-01T10:10:00Z",  // NEWEST
        url: "https://example.com/search3",
        method: "POST",
        appId: "test",
        requestHeaders: {},
        requestBody: "",
        responseStatus: 200,
        responseHeaders: {},
        responseBody: "",
        queries: [{
          id: "query3",
          index: "products",
          params: "query=shirts",
          queryID: "query789"
        }]
      }
    ]

    const events: InsightsRequest[] = [
      {
        type: 'insights_request',
        ts: "2024-01-01T10:01:00Z",  // After search1
        url: "https://example.com/insights1",
        method: "POST",
        requestHeaders: {},
        requestBody: "",
        responseStatus: 200,
        responseHeaders: {},
        responseBody: "",
        events: [{
          id: "event1",
          eventType: "click",
          eventName: "click",
          index: "products",
          objectIDs: ["123"],
          queryID: "query123"  // Links to search1
        }]
      },
      {
        type: 'insights_request',
        ts: "2024-01-01T10:06:00Z",  // After search2
        url: "https://example.com/insights2",
        method: "POST",
        requestHeaders: {},
        requestBody: "",
        responseStatus: 200,
        responseHeaders: {},
        responseBody: "",
        events: [{
          id: "event2",
          eventType: "click",
          eventName: "click",
          index: "products",
          objectIDs: ["456"],
          queryID: "query456"  // Links to search2
        }]
      },
      {
        type: 'insights_request',
        ts: "2024-01-01T10:07:00Z",  // After search2 (2nd event for same search)
        url: "https://example.com/insights3",
        method: "POST",
        requestHeaders: {},
        requestBody: "",
        responseStatus: 200,
        responseHeaders: {},
        responseBody: "",
        events: [{
          id: "event3",
          eventType: "conversion",
          eventName: "conversion",
          index: "products",
          objectIDs: ["456"],
          queryID: "query456"  // Links to search2
        }]
      },
      {
        type: 'insights_request',
        ts: "2024-01-01T10:11:00Z",  // After search3
        url: "https://example.com/insights4",
        method: "POST",
        requestHeaders: {},
        requestBody: "",
        responseStatus: 200,
        responseHeaders: {},
        responseBody: "",
        events: [{
          id: "event4",
          eventType: "click",
          eventName: "click",
          index: "products",
          objectIDs: ["789"],
          queryID: "query789"  // Links to search3
        }]
      }
    ]

    const result = groupTrafficByQueryId(searches, events)

    // Expected output structure:
    // Search 3 (newest)
    // |_ Event 4
    // Search 2
    // |_ Event 3 (newer)
    // |_ Event 2 (older)
    // Search 1 (oldest)
    // |_ Event 1

    expect(result).toHaveLength(7) // 3 searches + 4 events

    // Check Search 3 (newest) comes first
    expect(result[0].type).toBe('search')
    expect((result[0].item as SearchRequest).queries[0].queryID).toBe('query789')
    expect(result[0].level).toBe(0)

    // Check Event 4 is nested under Search 3
    expect(result[1].type).toBe('event')
    expect((result[1].item as any).queryID).toBe('query789')
    expect(result[1].level).toBe(1)
    expect(result[1].parentQueryId).toBe('query789')

    // Check Search 2 comes second
    expect(result[2].type).toBe('search')
    expect((result[2].item as SearchRequest).queries[0].queryID).toBe('query456')
    expect(result[2].level).toBe(0)

    // Check Event 3 is nested under Search 2 (newer event first)
    expect(result[3].type).toBe('event')
    expect((result[3].item as any).queryID).toBe('query456')
    expect(result[3].level).toBe(1)
    expect(result[3].parentQueryId).toBe('query456')

    // Check Event 2 is nested under Search 2 (older event second)
    expect(result[4].type).toBe('event')
    expect((result[4].item as any).queryID).toBe('query456')
    expect(result[4].level).toBe(1)
    expect(result[4].parentQueryId).toBe('query456')

    // Check Search 1 (oldest) comes last
    expect(result[5].type).toBe('search')
    expect((result[5].item as SearchRequest).queries[0].queryID).toBe('query123')
    expect(result[5].level).toBe(0)

    // Check Event 1 is nested under Search 1
    expect(result[6].type).toBe('event')
    expect((result[6].item as any).queryID).toBe('query123')
    expect(result[6].level).toBe(1)
    expect(result[6].parentQueryId).toBe('query123')
  })

  it('should handle searches without events', () => {
    const searches: SearchRequest[] = [
      {
        type: 'search_request',
        ts: "2024-01-01T10:00:00Z",
        url: "https://example.com/search1",
        method: "POST",
        appId: "test",
        requestHeaders: {},
        requestBody: "",
        responseStatus: 200,
        responseHeaders: {},
        responseBody: "",
        queries: [{
          id: "query1",
          index: "products",
          params: "query=shoes",
          queryID: "query123"
        }]
      }
    ]

    const events: InsightsRequest[] = []

    const result = groupTrafficByQueryId(searches, events)

    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('search')
    expect((result[0].item as SearchRequest).queries[0].queryID).toBe('query123')
    expect(result[0].hasChildren).toBe(false)
  })

  it('should handle events without QueryID', () => {
    const searches: SearchRequest[] = []

    const events: InsightsRequest[] = [
      {
        type: 'insights_request',
        ts: "2024-01-01T10:00:00Z",
        url: "https://example.com/insights1",
        method: "POST",
        requestHeaders: {},
        requestBody: "",
        responseStatus: 200,
        responseHeaders: {},
        responseBody: "",
        events: [{
          id: "event1",
          eventType: "click",
          eventName: "click",
          index: "products",
          objectIDs: ["123"]
          // No queryID
        }]
      }
    ]

    const result = groupTrafficByQueryId(searches, events)

    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('event')
    expect((result[0].item as any).id).toBe('event1')
    expect(result[0].level).toBe(0)
    expect(result[0].parentQueryId).toBeNull()
  })

  it('should group multi-query batches with headers', () => {
    const searches: SearchRequest[] = [
      {
        type: 'search_request',
        ts: "2024-01-01T10:00:00Z",
        url: "https://example.com/search1",
        method: "POST",
        appId: "test",
        requestHeaders: {},
        requestBody: "",
        responseStatus: 200,
        responseHeaders: {},
        responseBody: "",
        queries: [
          {
            id: "query1",
            subId: 0,
            index: "products",
            params: "query=shoes"
          },
          {
            id: "query2",
            subId: 1,
            index: "products",
            params: "query=hats"
          }
        ]
      },
      {
        type: 'search_request',
        ts: "2024-01-01T10:02:00Z",
        url: "https://example.com/search3",
        method: "POST",
        appId: "test",
        requestHeaders: {},
        requestBody: "",
        responseStatus: 200,
        responseHeaders: {},
        responseBody: "",
        queries: [{
          id: "query3",
          index: "products",
          params: "query=shirts"
        }]
      }
    ]

    const events: InsightsRequest[] = []

    const result = groupTrafficByQueryId(searches, events)

    expect(result).toHaveLength(4) // 1 single search + 1 batch header + 2 batch queries

    // Check single search comes first (newest timestamp)
    expect(result[0].type).toBe('search')
    expect((result[0].item as SearchRequest).queries[0].id).toBe('query3')
    expect(result[0].level).toBe(0)

    // Check batch header comes second
    expect(result[1].type).toBe('batch-header')
    expect((result[1].item as { count: number }).count).toBe(2)
    expect(result[1].level).toBe(0)

    // Check batch queries are nested under header
    expect(result[2].type).toBe('search')
    expect((result[2].item as SearchRequest).queries[0].id).toBe('query1') // First query
    expect(result[2].level).toBe(1)

    expect(result[3].type).toBe('search')
    expect((result[3].item as SearchRequest).queries[0].id).toBe('query2') // Second query
    expect(result[3].level).toBe(1)
  })

  it('should NOT mix queries from different search requests in the same batch', () => {
    // This test demonstrates the bug that was happening:
    // Multiple search requests with different query counts should NOT mix together
    const searches: SearchRequest[] = [
      {
        type: 'search_request',
        ts: "2024-01-01T10:00:00Z",
        url: "https://example.com/search1",
        method: "POST",
        appId: "test",
        requestHeaders: {},
        requestBody: "",
        responseStatus: 200,
        responseHeaders: {},
        responseBody: "",
        queries: [
          {
            id: "query1",
            subId: 0,
            index: "products",
            params: "query=shoes"
          },
          {
            id: "query2",
            subId: 1,
            index: "products",
            params: "query=hats"
          }
        ]
      },
      {
        type: 'search_request',
        ts: "2024-01-01T10:01:00Z",
        url: "https://example.com/search2",
        method: "POST",
        appId: "test",
        requestHeaders: {},
        requestBody: "",
        responseStatus: 200,
        responseHeaders: {},
        responseBody: "",
        queries: [
          {
            id: "query3",
            subId: 0,
            index: "products",
            params: "query=jackets"
          },
          {
            id: "query4",
            subId: 1,
            index: "products",
            params: "query=pants"
          }
        ]
      },
      {
        type: 'search_request',
        ts: "2024-01-01T10:02:00Z",
        url: "https://example.com/search3",
        method: "POST",
        appId: "test",
        requestHeaders: {},
        requestBody: "",
        responseStatus: 200,
        responseHeaders: {},
        responseBody: "",
        queries: [{
          id: "query5",
          index: "products",
          params: "query=shirts"
        }]
      }
    ]

    const events: InsightsRequest[] = []

    const result = groupTrafficByQueryId(searches, events)

    // Expected structure (after sorting by timestamp, newest first):
    // 1. Single search (query5) - newest, no batch
    // 2. Batch header for search2 (2 queries) - batch_1
    // 3. Search2 query1 (query3)
    // 4. Search2 query2 (query4)
    // 5. Batch header for search1 (2 queries) - batch_2
    // 6. Search1 query1 (query1)
    // 7. Search1 query2 (query2)

    expect(result).toHaveLength(7)

    // Check single search comes first (newest timestamp)
    expect(result[0].type).toBe('search')
    expect((result[0].item as SearchRequest).queries[0].id).toBe('query5')
    expect(result[0].level).toBe(0)
    expect(result[0].batchId).toBeNull()

    // Check first batch header (search2)
    expect(result[1].type).toBe('batch-header')
    expect((result[1].item as { count: number }).count).toBe(2)
    expect(result[1].level).toBe(0)
    expect(result[1].batchId).toBe('batch_1') // search2 is at index 1 after sorting

    // Check first batch queries (search2)
    expect(result[2].type).toBe('search')
    expect((result[2].item as SearchRequest).queries[0].id).toBe('query3')
    expect(result[2].level).toBe(1)
    expect(result[2].batchId).toBe('batch_1')

    expect(result[3].type).toBe('search')
    expect((result[3].item as SearchRequest).queries[0].id).toBe('query4')
    expect(result[3].level).toBe(1)
    expect(result[3].batchId).toBe('batch_1')

    // Check second batch header (search1)
    expect(result[4].type).toBe('batch-header')
    expect((result[4].item as { count: number }).count).toBe(2)
    expect(result[4].level).toBe(0)
    expect(result[4].batchId).toBe('batch_2') // search1 is at index 2 after sorting

    // Check second batch queries (search1)
    expect(result[5].type).toBe('search')
    expect((result[5].item as SearchRequest).queries[0].id).toBe('query1')
    expect(result[5].level).toBe(1)
    expect(result[5].batchId).toBe('batch_2')

    expect(result[6].type).toBe('search')
    expect((result[6].item as SearchRequest).queries[0].id).toBe('query2')
    expect(result[6].level).toBe(1)
    expect(result[6].batchId).toBe('batch_2')

    // CRITICAL: Ensure queries from different searches are NOT mixed
    // All queries in batch_1 should be from search2
    const batch1Items = result.filter(item => item.batchId === 'batch_1')
    const batch1QueryIds = batch1Items
      .filter(item => item.type === 'search')
      .map(item => (item.item as SearchRequest).queries[0].id)
    expect(batch1QueryIds).toEqual(['query3', 'query4']) // Only search2 queries

    // All queries in batch_2 should be from search1
    const batch2Items = result.filter(item => item.batchId === 'batch_2')
    const batch2QueryIds = batch2Items
      .filter(item => item.type === 'search')
      .map(item => (item.item as SearchRequest).queries[0].id)
    expect(batch2QueryIds).toEqual(['query1', 'query2']) // Only search1 queries
  })
})
