/**
 * Comprehensive tests for request parsing logic
 * Tests userToken extraction, edge cases, and error handling
 */

import { parseSearchRequest, parseInsightsRequest } from '../src/devtools/utils/request-parsers'
import type { SearchRequest, InsightsRequest } from '../src/devtools/types'

// Mock request factory for consistent test data
class RequestFactory {
  static createRequest(options: {
    url?: string
    method?: string
    headers?: Record<string, string>
    postData?: any
  } = {}) {
    return {
      url: options.url || 'https://example.com/search',
      method: options.method || 'POST',
      headers: options.headers || {},
      postData: options.postData || null
    }
  }

  static createResponse(options: {
    body?: string
    status?: number
    headers?: Record<string, string>
  } = {}) {
    return {
      body: options.body !== undefined ? options.body : '{"queryID": "test123"}',
      status: options.status || 200,
      headers: options.headers || {}
    }
  }
}

describe('Request Parsers', () => {
  const appId = 'test-app-123'

  describe('parseSearchRequest', () => {
    describe('Single Search Requests', () => {
      it('should parse basic single search with queryID', () => {
        const request = RequestFactory.createRequest({
          url: 'https://example.com/1/indexes/products/query',
          postData: JSON.stringify({ query: 'shoes' })
        })
        const response = RequestFactory.createResponse({
          body: '{"queryID": "query123", "hits": []}'
        })

        const result = parseSearchRequest(request, response.body, appId, Date.now())

        expect(result).toBeTruthy()
        expect(result?.type).toBe('search_request')
        expect(result?.queries).toHaveLength(1)
        expect(result?.queries[0].queryID).toBe('query123')
        expect(result?.queries[0].index).toBe('products')
      })

      it('should extract userToken from headers when no body userToken', () => {
        const request = RequestFactory.createRequest({
          url: 'https://example.com/1/indexes/products/query',
          headers: { 'X-Algolia-UserToken': 'user123' },
          postData: JSON.stringify({ query: 'shoes' })
        })
        const response = RequestFactory.createResponse()

        const result = parseSearchRequest(request, response.body, appId, Date.now())

        expect(result?.queries[0].userToken).toBe('user123')
      })

      it('should extract userToken from URL params when present', () => {
        const request = RequestFactory.createRequest({
          url: 'https://example.com/1/indexes/products/query',
          postData: 'query=shoes&userToken=user456'
        })
        const response = RequestFactory.createResponse()

        const result = parseSearchRequest(request, response.body, appId, Date.now())

        expect(result?.queries[0].userToken).toBe('user456')
      })

      it('should handle missing queryID gracefully', () => {
        const request = RequestFactory.createRequest({
          url: 'https://example.com/1/indexes/products/query',
          postData: JSON.stringify({ query: 'shoes' })
        })
        const response = RequestFactory.createResponse({
          body: '{"hits": []}' // No queryID
        })

        const result = parseSearchRequest(request, response.body, appId, Date.now())

        expect(result).toBeTruthy()
        expect(result?.queries[0].queryID).toBeUndefined()
      })

      it('should extract index from URL path', () => {
        const request = RequestFactory.createRequest({
          url: 'https://example.com/1/indexes/shopify_products/query',
          postData: JSON.stringify({ query: 'shoes' })
        })
        const response = RequestFactory.createResponse()

        const result = parseSearchRequest(request, response.body, appId, Date.now())

        expect(result?.queries[0].index).toBe('shopify_products')
      })

      it('should handle malformed JSON gracefully', () => {
        const request = RequestFactory.createRequest({
          url: 'https://example.com/1/indexes/products/query',
          postData: '{"query": "shoes", "malformed": }' // Invalid JSON
        })
        const response = RequestFactory.createResponse()

        const result = parseSearchRequest(request, response.body, appId, Date.now())

        expect(result).toBeTruthy()
        expect(result?.queries[0].params).toBe('{"query": "shoes", "malformed": }')
      })

      it('should handle empty response body', () => {
        const request = RequestFactory.createRequest({
          url: 'https://example.com/1/indexes/products/query',
          postData: JSON.stringify({ query: 'shoes' })
        })
        const response = RequestFactory.createResponse({ body: '' })

        const result = parseSearchRequest(request, response.body, appId, Date.now())

        expect(result).toBeTruthy()
        expect(result?.queries[0].queryID).toBeUndefined()
      })
    })

    describe('Multi-Search Requests', () => {
      it('should parse multi-search with 2+ queries', () => {
        const request = RequestFactory.createRequest({
          url: 'https://example.com/1/indexes/*/queries',
          postData: JSON.stringify({
            requests: [
              { indexName: 'products', params: 'query=shoes' },
              { indexName: 'categories', params: 'query=clothing' }
            ]
          })
        })
        const response = RequestFactory.createResponse({
          body: JSON.stringify({
            results: [
              { queryID: 'query1', hits: [] },
              { queryID: 'query2', hits: [] }
            ]
          })
        })

        const result = parseSearchRequest(request, response.body, appId, Date.now())

        expect(result).toBeTruthy()
        expect(result?.queries).toHaveLength(2)
        expect(result?.queries[0].queryID).toBe('query1')
        expect(result?.queries[1].queryID).toBe('query2')
        expect(result?.queries[0].index).toBe('products')
        expect(result?.queries[1].index).toBe('categories')
      })

      it('should apply header userToken to all queries without body userToken', () => {
        const request = RequestFactory.createRequest({
          url: 'https://example.com/1/indexes/*/queries',
          headers: { 'X-Algolia-UserToken': 'user123' },
          postData: JSON.stringify({
            requests: [
              { indexName: 'products', params: 'query=shoes' },
              { indexName: 'categories', params: 'query=clothing' }
            ]
          })
        })
        const response = RequestFactory.createResponse({
          body: JSON.stringify({
            results: [
              { queryID: 'query1', hits: [] },
              { queryID: 'query2', hits: [] }
            ]
          })
        })

        const result = parseSearchRequest(request, response.body, appId, Date.now())

        expect(result?.queries[0].userToken).toBe('user123')
        expect(result?.queries[1].userToken).toBe('user123')
      })

      it('should use body userToken when present, fallback to header', () => {
        const request = RequestFactory.createRequest({
          url: 'https://example.com/1/indexes/*/queries',
          headers: { 'X-Algolia-UserToken': 'user123' },
          postData: JSON.stringify({
            requests: [
              { indexName: 'products', params: 'query=shoes' }, // Gets header userToken
              { indexName: 'categories', params: 'query=clothing&userToken=user456' } // Gets body userToken
            ]
          })
        })
        const response = RequestFactory.createResponse({
          body: JSON.stringify({
            results: [
              { queryID: 'query1', hits: [] },
              { queryID: 'query2', hits: [] }
            ]
          })
        })

        const result = parseSearchRequest(request, response.body, appId, Date.now())

        expect(result?.queries[0].userToken).toBe('user123') // From header
        expect(result?.queries[1].userToken).toBe('user456') // From body
      })

      it('should handle mixed scenarios (some with body userToken, some without)', () => {
        const request = RequestFactory.createRequest({
          url: 'https://example.com/1/indexes/*/queries',
          headers: { 'X-Algolia-UserToken': 'user123' },
          postData: JSON.stringify({
            requests: [
              { indexName: 'products', params: 'query=shoes' }, // Header userToken
              { indexName: 'categories', params: 'query=clothing&userToken=user456' }, // Body userToken
              { indexName: 'brands', params: 'query=nike' }, // Header userToken
              { indexName: 'tags', params: 'query=sport&userToken=user789' } // Body userToken
            ]
          })
        })
        const response = RequestFactory.createResponse({
          body: JSON.stringify({
            results: [
              { queryID: 'query1', hits: [] },
              { queryID: 'query2', hits: [] },
              { queryID: 'query3', hits: [] },
              { queryID: 'query4', hits: [] }
            ]
          })
        })

        const result = parseSearchRequest(request, response.body, appId, Date.now())

        expect(result?.queries[0].userToken).toBe('user123') // Header
        expect(result?.queries[1].userToken).toBe('user456') // Body
        expect(result?.queries[2].userToken).toBe('user123') // Header
        expect(result?.queries[3].userToken).toBe('user789') // Body
      })

      it('should preserve individual query userTokens in batch', () => {
        const request = RequestFactory.createRequest({
          url: 'https://example.com/1/indexes/*/queries',
          postData: JSON.stringify({
            requests: [
              { indexName: 'products', params: 'query=shoes&userToken=user1' },
              { indexName: 'categories', params: 'query=clothing&userToken=user2' },
              { indexName: 'brands', params: 'query=nike&userToken=user3' }
            ]
          })
        })
        const response = RequestFactory.createResponse({
          body: JSON.stringify({
            results: [
              { queryID: 'query1', hits: [] },
              { queryID: 'query2', hits: [] },
              { queryID: 'query3', hits: [] }
            ]
          })
        })

        const result = parseSearchRequest(request, response.body, appId, Date.now())

        expect(result?.queries[0].userToken).toBe('user1')
        expect(result?.queries[1].userToken).toBe('user2')
        expect(result?.queries[2].userToken).toBe('user3')
      })

      it('should handle missing response results gracefully', () => {
        const request = RequestFactory.createRequest({
          url: 'https://example.com/1/indexes/*/queries',
          postData: JSON.stringify({
            requests: [
              { indexName: 'products', params: 'query=shoes' },
              { indexName: 'categories', params: 'query=clothing' }
            ]
          })
        })
        const response = RequestFactory.createResponse({
          body: '{"results": []}' // Empty results
        })

        const result = parseSearchRequest(request, response.body, appId, Date.now())

        expect(result).toBeTruthy()
        expect(result?.queries).toHaveLength(0) // No queries created due to missing results
      })

      it('should preserve subId ordering', () => {
        const request = RequestFactory.createRequest({
          url: 'https://example.com/1/indexes/*/queries',
          postData: JSON.stringify({
            requests: [
              { indexName: 'products', params: 'query=shoes' },
              { indexName: 'categories', params: 'query=clothing' },
              { indexName: 'brands', params: 'query=nike' }
            ]
          })
        })
        const response = RequestFactory.createResponse({
          body: JSON.stringify({
            results: [
              { queryID: 'query1', hits: [] },
              { queryID: 'query2', hits: [] },
              { queryID: 'query3', hits: [] }
            ]
          })
        })

        const result = parseSearchRequest(request, response.body, appId, Date.now())

        expect(result?.queries[0].subId).toBe(0)
        expect(result?.queries[1].subId).toBe(1)
        expect(result?.queries[2].subId).toBe(2)
      })
    })

    describe('Edge Cases', () => {
      it('should handle URL-encoded userToken in params string', () => {
        const request = RequestFactory.createRequest({
          url: 'https://example.com/1/indexes/*/queries',
          postData: JSON.stringify({
            requests: [
              { indexName: 'products', params: 'query=shoes&userToken=user%20123' } // URL encoded space
            ]
          })
        })
        const response = RequestFactory.createResponse({
          body: JSON.stringify({
            results: [{ queryID: 'query1', hits: [] }]
          })
        })

        const result = parseSearchRequest(request, response.body, appId, Date.now())

        expect(result?.queries[0].userToken).toBe('user 123') // Decoded
      })

      it('should handle userToken in nested request parameters', () => {
        const request = RequestFactory.createRequest({
          url: 'https://example.com/1/indexes/*/queries',
          postData: JSON.stringify({
            requests: [
              { 
                indexName: 'products', 
                params: 'query=shoes',
                userToken: 'nested123' // Direct userToken property
              }
            ]
          })
        })
        const response = RequestFactory.createResponse({
          body: JSON.stringify({
            results: [{ queryID: 'query1', hits: [] }]
          })
        })

        const result = parseSearchRequest(request, response.body, appId, Date.now())

        expect(result?.queries[0].userToken).toBe('nested123')
      })

      it('should handle empty userToken strings vs undefined', () => {
        const request = RequestFactory.createRequest({
          url: 'https://example.com/1/indexes/*/queries',
          postData: JSON.stringify({
            requests: [
              { indexName: 'products', params: 'query=shoes&userToken=' }, // Empty string
              { indexName: 'categories', params: 'query=clothing' } // No userToken
            ]
          })
        })
        const response = RequestFactory.createResponse({
          body: JSON.stringify({
            results: [
              { queryID: 'query1', hits: [] },
              { queryID: 'query2', hits: [] }
            ]
          })
        })

        const result = parseSearchRequest(request, response.body, appId, Date.now())

        expect(result?.queries[0].userToken).toBe('') // Empty string preserved
        expect(result?.queries[1].userToken).toBeUndefined() // No userToken
      })

      it('should handle malformed userToken values gracefully', () => {
        const request = RequestFactory.createRequest({
          url: 'https://example.com/1/indexes/*/queries',
          postData: JSON.stringify({
            requests: [
              { indexName: 'products', params: 'query=shoes&userToken=null' }, // String "null"
              { indexName: 'categories', params: 'query=clothing&userToken=undefined' } // String "undefined"
            ]
          })
        })
        const response = RequestFactory.createResponse({
          body: JSON.stringify({
            results: [
              { queryID: 'query1', hits: [] },
              { queryID: 'query2', hits: [] }
            ]
          })
        })

        const result = parseSearchRequest(request, response.body, appId, Date.now())

        expect(result?.queries[0].userToken).toBe('null') // Treated as literal string
        expect(result?.queries[1].userToken).toBe('undefined') // Treated as literal string
      })
    })
  })

  describe('parseInsightsRequest', () => {
    it('should parse standard {"events": [...]} format', () => {
      const request = RequestFactory.createRequest({
        url: 'https://example.com/1/events',
        postData: JSON.stringify({
          events: [
            { eventType: 'click', objectID: '123', index: 'products' },
            { eventType: 'view', objectID: '456', index: 'categories' }
          ]
        })
      })
      const response = RequestFactory.createResponse()

      const result = parseInsightsRequest(request, response.body, Date.now())

      expect(result).toBeTruthy()
      expect(result?.type).toBe('insights_request')
      expect(result?.events).toHaveLength(2)
      expect(result?.events[0].eventType).toBe('click')
      expect(result?.events[1].eventType).toBe('view')
    })

    it('should parse direct array format', () => {
      const request = RequestFactory.createRequest({
        url: 'https://example.com/1/events',
        postData: JSON.stringify([
          { eventType: 'click', objectID: '123', index: 'products' },
          { eventType: 'view', objectID: '456', index: 'categories' }
        ])
      })
      const response = RequestFactory.createResponse()

      const result = parseInsightsRequest(request, response.body, Date.now())

      expect(result).toBeTruthy()
      expect(result?.events).toHaveLength(2)
    })

    it('should parse single event format', () => {
      const request = RequestFactory.createRequest({
        url: 'https://example.com/1/events',
        postData: JSON.stringify({
          eventType: 'click',
          eventName: 'Product Clicked',
          objectID: '123',
          index: 'products'
        })
      })
      const response = RequestFactory.createResponse()

      const result = parseInsightsRequest(request, response.body, Date.now())

      expect(result).toBeTruthy()
      expect(result?.events).toHaveLength(1)
      expect(result?.events[0].eventType).toBe('click')
    })

    it('should extract userToken from headers or event data', () => {
      const request = RequestFactory.createRequest({
        url: 'https://example.com/1/events',
        headers: { 'X-Algolia-UserToken': 'user123' },
        postData: JSON.stringify({
          events: [
            { eventType: 'click', objectID: '123', index: 'products' },
            { eventType: 'view', objectID: '456', index: 'categories', userToken: 'user456' }
          ]
        })
      })
      const response = RequestFactory.createResponse()

      const result = parseInsightsRequest(request, response.body, Date.now())

      expect(result?.events[0].userToken).toBe('user123') // From header
      expect(result?.events[1].userToken).toBe('user456') // From event data
    })

    it('should determine event type from eventType or eventName', () => {
      const request = RequestFactory.createRequest({
        url: 'https://example.com/1/events',
        postData: JSON.stringify({
          events: [
            { eventType: 'click', objectID: '123', index: 'products' },
            { eventName: 'Product Viewed', objectID: '456', index: 'categories' },
            { eventName: 'Add to Cart', objectID: '789', index: 'products' },
            { eventName: 'Purchase Completed', objectID: '101', index: 'orders' }
          ]
        })
      })
      const response = RequestFactory.createResponse()

      const result = parseInsightsRequest(request, response.body, Date.now())

      expect(result?.events[0].eventType).toBe('click') // From eventType
      expect(result?.events[1].eventType).toBe('view') // From eventName "Viewed"
      expect(result?.events[2].eventType).toBe('conversion') // From eventName "Add to Cart"
      expect(result?.events[3].eventType).toBe('conversion') // From eventName "Purchase"
    })

    it('should handle missing objectIDs gracefully', () => {
      const request = RequestFactory.createRequest({
        url: 'https://insights.algolia.io/1/events',
        postData: JSON.stringify({
          events: [
            { eventType: 'click', index: 'products' }, // No objectID
            { eventType: 'view', objectID: '456', index: 'categories' },
            { eventType: 'conversion', index: 'orders' } // No objectID
          ]
        })
      })
      const response = RequestFactory.createResponse()

      const result = parseInsightsRequest(request, response.body, Date.now())

      expect(result?.events[0].objectIDs).toEqual([]) // Empty array
      expect(result?.events[1].objectIDs).toEqual(['456']) // Single objectID
      expect(result?.events[2].objectIDs).toEqual([]) // Empty array
    })

    it('should parse real-world Shopify Insights event format', () => {
      // This test case matches the format from real-world Insights requests (with mocked data)
      const request = RequestFactory.createRequest({
        url: 'https://insights.algolia.io/1/events?X-Algolia-Application-Id=MOCK_APP_ID&X-Algolia-API-Key=mock_api_key&X-Algolia-Agent=insights-js%20(2.16.3)',
        postData: JSON.stringify({
          events: [{
            eventType: 'conversion',
            eventSubtype: 'addToCart',
            index: 'shopify_us_live_products',
            objectIDs: ['mock_object_id_123'],
            currency: 'USD',
            eventName: 'Add To Cart',
            userToken: 'mock_user_token_456'
          }]
        })
      })
      const response = RequestFactory.createResponse()

      const result = parseInsightsRequest(request, response.body, Date.now())

      expect(result).toBeTruthy()
      expect(result?.events).toHaveLength(1)
      
      const event = result!.events[0]
      expect(event.eventType).toBe('conversion')
      expect(event.eventName).toBe('Add To Cart')
      expect(event.index).toBe('shopify_us_live_products')
      expect(event.objectIDs).toEqual(['mock_object_id_123'])
      expect(event.userToken).toBe('mock_user_token_456')
      
      // Verify the request details
      expect(result!.url).toBe('https://insights.algolia.io/1/events?X-Algolia-Application-Id=MOCK_APP_ID&X-Algolia-API-Key=mock_api_key&X-Algolia-Agent=insights-js%20(2.16.3)')
      expect(result!.method).toBe('POST')
    })
  })
})
