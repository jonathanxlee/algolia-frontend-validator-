/**
 * Tests for traffic grouping utilities
 */

import { groupTrafficByQueryId } from '../src/devtools/utils/traffic-grouping'

describe('groupTrafficByQueryId', () => {
  it('should group traffic with searches newest first and events nested underneath', () => {
    // Test data matching the user's requirements
    const searches = [
      {
        id: "search1",
        time: "2024-01-01T10:00:00Z",  // OLDEST
        queryId: "query123",
        batchId: "batch1"
      },
      {
        id: "search2", 
        time: "2024-01-01T10:05:00Z",  // NEWER
        queryId: "query456",
        batchId: "batch2"
      },
      {
        id: "search3",
        time: "2024-01-01T10:10:00Z",  // NEWEST
        queryId: "query789",
        batchId: "batch3"
      }
    ]

    const events = [
      {
        id: "event1",
        time: "2024-01-01T10:01:00Z",  // After search1
        queryId: "query123",            // Links to search1
        type: "click"
      },
      {
        id: "event2", 
        time: "2024-01-01T10:06:00Z",  // After search2
        queryId: "query456",            // Links to search2
        type: "click"
      },
      {
        id: "event3",
        time: "2024-01-01T10:07:00Z",  // After search2 (2nd event for same search)
        queryId: "query456",            // Links to search2
        type: "conversion"
      },
      {
        id: "event4",
        time: "2024-01-01T10:11:00Z",  // After search3
        queryId: "query789",            // Links to search3
        type: "click"
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
    expect(result[0].item.id).toBe('search3')
    expect(result[0].level).toBe(0)

    // Check Event 4 is nested under Search 3
    expect(result[1].type).toBe('event')
    expect(result[1].item.id).toBe('event4')
    expect(result[1].level).toBe(1)
    expect(result[1].parentQueryId).toBe('query789')

    // Check Search 2 comes second
    expect(result[2].type).toBe('search')
    expect(result[2].item.id).toBe('search2')
    expect(result[2].level).toBe(0)

    // Check Event 3 is nested under Search 2 (newer event first)
    expect(result[3].type).toBe('event')
    expect(result[3].item.id).toBe('event3')
    expect(result[3].level).toBe(1)
    expect(result[3].parentQueryId).toBe('query456')

    // Check Event 2 is nested under Search 2 (older event second)
    expect(result[4].type).toBe('event')
    expect(result[4].item.id).toBe('event2')
    expect(result[4].level).toBe(1)
    expect(result[4].parentQueryId).toBe('query456')

    // Check Search 1 (oldest) comes last
    expect(result[5].type).toBe('search')
    expect(result[5].item.id).toBe('search1')
    expect(result[5].level).toBe(0)

    // Check Event 1 is nested under Search 1
    expect(result[6].type).toBe('event')
    expect(result[6].item.id).toBe('event1')
    expect(result[6].level).toBe(1)
    expect(result[6].parentQueryId).toBe('query123')
  })

  it('should handle searches without events', () => {
    const searches = [
      {
        id: "search1",
        time: "2024-01-01T10:00:00Z",
        queryId: "query123"
      }
    ]

    const events: any[] = []

    const result = groupTrafficByQueryId(searches, events)

    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('search')
    expect(result[0].item.id).toBe('search1')
    expect(result[0].hasChildren).toBe(false)
  })

  it('should handle events without QueryID', () => {
    const searches: any[] = []

    const events = [
      {
        id: "event1",
        time: "2024-01-01T10:00:00Z",
        type: "click"
        // No queryId
      }
    ]

    const result = groupTrafficByQueryId(searches, events)

    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('event')
    expect(result[0].item.id).toBe('event1')
    expect(result[0].level).toBe(0)
    expect(result[0].parentQueryId).toBeNull()
  })

  it('should group multi-query batches with headers', () => {
    const searches = [
      {
        id: "search1",
        time: "2024-01-01T10:00:00Z",
        queryId: "query123",
        batchId: "batch1",
        isMultiRequest: true
      },
      {
        id: "search2",
        time: "2024-01-01T10:01:00Z",
        queryId: "query456",
        batchId: "batch1",
        isMultiRequest: true
      },
      {
        id: "search3",
        time: "2024-01-01T10:02:00Z",
        queryId: "query789"
        // No batchId, single search
      }
    ]

    const events: any[] = []

    const result = groupTrafficByQueryId(searches, events)

    expect(result).toHaveLength(4) // 1 batch header + 2 batch searches + 1 single search

    // Check batch header comes first
    expect(result[0].type).toBe('batch-header')
    expect(result[0].item.batchId).toBe('batch1')
    expect(result[0].item.count).toBe(2)
    expect(result[0].level).toBe(0)

    // Check batch searches are nested under header
    expect(result[1].type).toBe('search')
    expect(result[1].item.id).toBe('search2') // Newer first
    expect(result[1].level).toBe(1)

    expect(result[2].type).toBe('search')
    expect(result[2].item.id).toBe('search1') // Older second
    expect(result[2].level).toBe(1)

    // Check single search comes after batch
    expect(result[3].type).toBe('search')
    expect(result[3].item.id).toBe('search3')
    expect(result[3].level).toBe(0)
  })
})
