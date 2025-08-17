import React from 'react'
import { render, screen } from '@testing-library/react'
import { LiveTraffic } from '../src/devtools/pages/live-traffic'
import { useAppStore } from '../src/store'

// Mock the store
jest.mock('../src/store', () => ({
  useAppStore: jest.fn()
}))

// Mock the components
jest.mock('../src/devtools/components/traffic-card', () => ({
  TrafficCard: ({ item, isExpanded, onToggle }: any) => (
    <div data-testid={`traffic-card-${item.type}`} onClick={onToggle}>
      {item.type} - {isExpanded ? 'expanded' : 'collapsed'}
    </div>
  )
}))

jest.mock('../src/devtools/components/batch-group', () => ({
  BatchGroup: ({ batchId, count, items }: any) => (
    <div data-testid={`batch-group-${batchId}`}>
      <div data-testid="batch-header">Batch {count} items</div>
      {items.map((item: any, index: number) => (
        <div key={index} data-testid={`batch-item-${item.type}`}>
          {item.type}
        </div>
      ))}
    </div>
  )
}))

// Mock the traffic grouping utility
jest.mock('../src/devtools/utils/traffic-grouping', () => ({
  groupTrafficByQueryId: jest.fn()
}))

describe('LiveTraffic Component - Simple Tests', () => {
  const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>
  const mockGroupTrafficByQueryId = require('../src/devtools/utils/traffic-grouping').groupTrafficByQueryId
  
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Empty States', () => {
    it('should show "No active tab found" when no active tab', () => {
      mockUseAppStore.mockReturnValue({
        activeTabId: undefined,
        tabs: {},
        config: { searchHosts: [], insightsHosts: [], validateOnlyWhenClickAnalyticsTrue: false, expectationTimeoutSec: 30 }
      })

      render(<LiveTraffic />)
      expect(screen.getByText('No active tab found')).toBeInTheDocument()
    })

    it('should show "No traffic detected yet" when tab exists but no traffic', () => {
      // Mock the traffic grouping to return empty array
      mockGroupTrafficByQueryId.mockReturnValue([])

      mockUseAppStore.mockReturnValue({
        activeTabId: 1,
        tabs: {
          1: {
            tabId: 1,
            isCapturing: false,
            searches: [],
            events: [],
            issues: [],
            expectations: []
          }
        },
        config: { searchHosts: [], insightsHosts: [], validateOnlyWhenClickAnalyticsTrue: false, expectationTimeoutSec: 30 }
      })

      render(<LiveTraffic />)
      expect(screen.getByText('No traffic detected yet')).toBeInTheDocument()
    })
  })

  describe('Traffic Display', () => {
    it('should display traffic count correctly', () => {
      const mockTab = {
        tabId: 1,
        isCapturing: true,
        searches: [
          {
            type: 'search_request',
            ts: '2024-01-01T10:00:00Z',
            url: 'https://example.com/search',
            method: 'POST',
            appId: 'test',
            requestHeaders: {},
            requestBody: '',
            responseStatus: 200,
            responseHeaders: {},
            responseBody: '',
            queries: [{
              id: 'query1',
              index: 'products',
              params: 'query=shoes',
              queryID: 'query123'
            }]
          }
        ],
        events: [],
        issues: [],
        expectations: []
      }

      // Mock the traffic grouping to return a search item
      mockGroupTrafficByQueryId.mockReturnValue([
        {
          type: 'search',
          item: mockTab.searches[0],
          batchId: undefined
        }
      ])

      mockUseAppStore.mockReturnValue({
        activeTabId: 1,
        tabs: { 1: mockTab },
        config: { searchHosts: [], insightsHosts: [], validateOnlyWhenClickAnalyticsTrue: false, expectationTimeoutSec: 30 }
      })

      render(<LiveTraffic />)
      expect(screen.getByText('Live Traffic')).toBeInTheDocument()
      expect(screen.getByText('1 of 1 requests')).toBeInTheDocument()
    })

    it('should handle mixed traffic types', () => {
      const mockTab = {
        tabId: 1,
        isCapturing: true,
        searches: [
          {
            type: 'search_request',
            ts: '2024-01-01T10:00:00Z',
            url: 'https://example.com/search',
            method: 'POST',
            appId: 'test',
            requestHeaders: {},
            requestBody: '',
            responseStatus: 200,
            responseHeaders: {},
            responseBody: '',
            queries: [{
              id: 'query1',
              index: 'products',
              params: 'query=shoes',
              queryID: 'query123'
            }]
          }
        ],
        events: [
          {
            type: 'insights_request',
            ts: '2024-01-01T10:01:00Z',
            url: 'https://example.com/insights',
            method: 'POST',
            requestHeaders: {},
            requestBody: '',
            responseStatus: 200,
            responseHeaders: {},
            responseBody: '',
            events: [{
              id: 'event1',
              eventType: 'click',
              eventName: 'click',
              index: 'products',
              objectIDs: ['123'],
              queryID: 'query123'
            }]
          }
        ],
        issues: [],
        expectations: []
      }

      // Mock the traffic grouping to return both search and event items
      mockGroupTrafficByQueryId.mockReturnValue([
        {
          type: 'search',
          item: mockTab.searches[0],
          batchId: undefined
        },
        {
          type: 'event',
          item: mockTab.events[0],
          batchId: undefined
        }
      ])

      mockUseAppStore.mockReturnValue({
        activeTabId: 1,
        tabs: { 1: mockTab },
        config: { searchHosts: [], insightsHosts: [], validateOnlyWhenClickAnalyticsTrue: false, expectationTimeoutSec: 30 }
      })

      render(<LiveTraffic />)
      expect(screen.getByText('2 of 2 requests')).toBeInTheDocument()
    })
  })

  describe('Filtering Logic', () => {
    it('should filter out view events by default', () => {
      const mockTab = {
        tabId: 1,
        isCapturing: true,
        searches: [],
        events: [
          {
            type: 'insights_request',
            ts: '2024-01-01T10:00:00Z',
            url: 'https://example.com/insights',
            method: 'POST',
            requestHeaders: {},
            requestBody: '',
            responseStatus: 200,
            responseHeaders: {},
            responseBody: '',
            events: [{
              id: 'event1',
              eventType: 'view',
              eventName: 'view',
              index: 'products',
              objectIDs: ['123'],
              queryID: undefined
            }]
          }
        ],
        issues: [],
        expectations: []
      }

      // Mock the traffic grouping to return a view event that should be filtered out
      // The filtering logic checks item.eventType, so we need to mock the item structure correctly
      mockGroupTrafficByQueryId.mockReturnValue([
        {
          type: 'event',
          item: {
            // The item should have eventType at the top level for filtering to work
            eventType: 'view',
            eventName: 'view',
            index: 'products',
            objectIDs: ['123'],
            queryID: undefined
          },
          batchId: undefined
        }
      ])

      mockUseAppStore.mockReturnValue({
        activeTabId: 1,
        tabs: { 1: mockTab },
        config: { searchHosts: [], insightsHosts: [], validateOnlyWhenClickAnalyticsTrue: false, expectationTimeoutSec: 30 }
      })

      render(<LiveTraffic />)
      expect(screen.getByText('No matching traffic')).toBeInTheDocument()
    })
  })
})
