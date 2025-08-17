/**
 * Request parsing logic for different types of Algolia requests
 * Updated to work with new nested schema structure
 */

import type { SearchRequest, InsightsRequest, SearchQuery, InsightsEvent } from '../types'
import {
  extractRequestBody,
  parseRequestParams,
  isMultiRequestFormat,
  extractUserToken,
  extractQueryUserToken,
  extractClickAnalytics,
  extractIndices,
  extractIndicesFromUrl,
  extractQueryId,
  extractHitsSample,
  generateRequestId,
  generateBatchId
} from './network-helpers'

/**
 * Parse search request and return SearchRequest with nested queries
 */
export function parseSearchRequest(
  request: any,
  responseBody: string,
  appId: string,
  timestamp?: number
): SearchRequest | null {
  try {
    console.log('[DEBUG] parseSearchRequest called with:', {
      url: request.url,
      hasPostData: !!request.postData,
      appId
    })
    
    // Extract and parse request data
    const requestBody = extractRequestBody(request.postData)
    const parsedParams = parseRequestParams(requestBody)
    
    console.log('[DEBUG] Parsed request params:', {
      requestBody: requestBody.substring(0, 200),
      parsedParams: JSON.stringify(parsedParams).substring(0, 200)
    })
    
    // Check if this is a multi-request format
    if (isMultiRequestFormat(parsedParams)) {
      console.log('[DEBUG] Multi-request format detected')
      return parseMultiSearchRequest(request, responseBody, parsedParams, appId, timestamp)
    } else {
      console.log('[DEBUG] Single request format detected')
      return parseSingleSearchRequest(request, responseBody, parsedParams, appId, timestamp)
    }
  } catch (error) {
    console.error('[ERROR] Failed to parse search request:', error)
    return null
  }
}

/**
 * Parse single search request
 */
function parseSingleSearchRequest(
  request: any,
  responseBody: string,
  parsedParams: any,
  appId: string,
  timestamp?: number
): SearchRequest {
  // Extract request body for rawRequestBody
  const requestBody = extractRequestBody(request.postData)

  // Extract data using helper functions
  const userToken = extractUserToken(request, parsedParams)
  const clickAnalytics = extractClickAnalytics(parsedParams)
  // For single requests, extract indices from URL since they're not in the request body
  const indices = extractIndicesFromUrl(request.url)
  const queryId = responseBody ? extractQueryId(responseBody) : undefined

  console.log('[DEBUG] Single search request parsed:', {
    userToken,
    clickAnalytics,
    indices,
    queryId
  })

  // Create the nested structure
  const searchQuery: SearchQuery = {
    id: generateRequestId('query'),
    index: indices[0] || 'unknown',
    params: requestBody, // Use original request body to preserve malformed JSON
    queryID: queryId,
    userToken,
    clickAnalytics
  }

  return {
    type: 'search_request',
    ts: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
    url: request.url,
    method: request.method as 'GET' | 'POST',
    appId,
    requestHeaders: request.headers || {},
    requestBody,
    responseStatus: 200, // Default, could be extracted from response
    responseHeaders: {}, // Could be extracted from response
    responseBody,
    queries: [searchQuery]
  }
}

/**
 * Parse multi-search request and return SearchRequest with multiple queries
 */
function parseMultiSearchRequest(
  request: any,
  responseBody: string,
  parsedParams: any,
  appId: string,
  timestamp?: number
): SearchRequest {
  const requests = parsedParams.requests
  const batchId = generateBatchId()
  
  console.log('[DEBUG] Multi-search request:', {
    requestsCount: requests.length,
    batchId
  })

  // Parse response to get results array
  let results: any[] = []
  try {
    const responseData = JSON.parse(responseBody)
    results = responseData.results || []
    console.log('[DEBUG] Response results:', {
      resultsCount: results.length,
      hasResults: !!responseData.results
    })
  } catch {
    console.log('[DEBUG] Could not parse response body for results')
    // Ignore parsing errors, continue with empty results
  }

  // Create individual SearchQuery objects for each request
  const searchQueries: SearchQuery[] = []

  requests.forEach((req: any, index: number) => {
    try {
      const result = results[index]
      if (!result) {
        console.log(`[DEBUG] No result for request ${index}`)
        return // Skip if no matching result
      }
      
      // Extract data for this individual request
      const indices = req.indexName ? [req.indexName] : []
      const clickAnalytics = req.params ? req.params.includes('clickAnalytics=true') : false
      const userToken = extractQueryUserToken(req, extractUserToken(request, parsedParams))
      const queryId = result.queryID || result.queryId
      
      console.log(`[DEBUG] Multi-search request ${index} parsed:`, {
        indices,
        clickAnalytics,
        userToken,
        queryId
      })
      
      const searchQuery: SearchQuery = {
        id: generateRequestId('query'),
        subId: index,
        index: indices[0] || 'unknown',
        params: JSON.stringify(req),
        queryID: queryId,
        userToken,
        clickAnalytics
      }
      
      searchQueries.push(searchQuery)
    } catch (error) {
      console.error(`[ERROR] Failed to parse multi-search request ${index}:`, error)
    }
  })

  console.log(`[DEBUG] Created ${searchQueries.length} search queries`)
  
  return {
    type: 'search_request',
    ts: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
    url: request.url,
    method: request.method as 'GET' | 'POST',
    appId,
    requestHeaders: request.headers || {},
    requestBody: JSON.stringify(parsedParams),
    responseStatus: 200,
    responseHeaders: {},
    responseBody,
    queries: searchQueries
  }
}

/**
 * Parse insights request
 */
export function parseInsightsRequest(
  request: any,
  responseBody: string,
  timestamp?: number
): InsightsRequest | null {
  try {
    console.log('[DEBUG] parseInsightsRequest called with:', {
      url: request.url,
      hasPostData: !!request.postData,
      responseBodyLength: responseBody.length
    })
    
    const requestBody = extractRequestBody(request.postData)
    const parsedParams = parseRequestParams(requestBody)
    
    console.log('[DEBUG] Insights request parsed:', {
      requestBody: requestBody.substring(0, 200),
      parsedParams: JSON.stringify(parsedParams).substring(0, 200)
    })
    
    // Handle different event formats:
    // 1. {"events": [...]} - Standard Algolia Insights format
    // 2. [...] - Direct array format
    // 3. {...} - Single event format
    let events: any[] = []
    
    if (parsedParams.events && Array.isArray(parsedParams.events)) {
      // Format: {"events": [...]}
      events = parsedParams.events
      console.log('[DEBUG] Found events array in parsedParams.events:', events.length)
    } else if (Array.isArray(parsedParams)) {
      // Format: [...] - Direct array
      events = parsedParams
      console.log('[DEBUG] Found direct events array:', events.length)
    } else if (parsedParams.eventType || parsedParams.eventName) {
      // Format: {...} - Single event
      events = [parsedParams]
      console.log('[DEBUG] Found single event object')
    } else {
      console.log('[DEBUG] No events found in parsed params')
      return null
    }
    
    if (events.length === 0) {
      console.log('[DEBUG] Events array is empty')
      return null
    }
    
    // Create InsightsEvent objects
    const insightsEvents: InsightsEvent[] = events.map((event, index) => {
      // Determine event type
      let eventType: 'click' | 'conversion' | 'view' = 'view'
      if (event.eventType) {
        eventType = event.eventType
      } else if (event.eventName) {
        const name = event.eventName.toLowerCase()
        if (name.includes('click')) eventType = 'click'
        else if (name.includes('conversion') || name.includes('purchase') || name.includes('addtocart') || name.includes('add to cart')) eventType = 'conversion'
        else if (name.includes('view')) eventType = 'view'
      }
      
      // Extract data
      const userToken = event.userToken || extractUserToken(request, parsedParams)
      const objectIDs = event.objectIDs || []
      if (event.objectID) objectIDs.push(event.objectID)
      
      console.log(`[DEBUG] Event ${index} data extracted:`, {
        eventType,
        userToken,
        objectIDsCount: objectIDs.length,
        queryID: event.queryID
      })
      
      return {
        id: generateRequestId('event'),
        eventType,
        eventName: event.eventName || 'unknown',
        index: event.index || 'unknown',
        objectIDs,
        queryID: event.queryID,
        userToken
      }
    })
    
    return {
      type: 'insights_request',
      ts: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
      url: request.url,
      method: request.method as 'GET' | 'POST',
      requestHeaders: request.headers || {},
      requestBody,
      responseStatus: 200,
      responseHeaders: {},
      responseBody,
      events: insightsEvents
    }
  } catch (error) {
    console.error('[ERROR] Failed to parse insights request:', error)
    return null
  }
}
