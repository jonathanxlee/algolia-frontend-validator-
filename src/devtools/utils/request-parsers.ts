/**
 * Request parsing logic for different types of Algolia requests
 */

import type { SearchRequest, EventRequest } from '../../shared/types'
import {
  extractRequestBody,
  parseRequestParams,
  isMultiRequestFormat,
  extractUserToken,
  extractClickAnalytics,
  extractIndices,
  extractQueryId,
  extractHitsSample,
  generateRequestId,
  generateBatchId
} from './network-helpers'

/**
 * Parse search request and return single or multiple SearchRequest objects
 */
export function parseSearchRequest(
  request: any,
  responseBody: string,
  appId: string
): SearchRequest | SearchRequest[] | null {
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
      return parseMultiSearchRequest(request, responseBody, parsedParams, appId)
    } else {
      console.log('[DEBUG] Single request format detected')
      return parseSingleSearchRequest(request, responseBody, parsedParams, appId)
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
  appId: string
): SearchRequest {
  // Extract request body for rawRequestBody
  const requestBody = extractRequestBody(request.postData)

  // Extract data using helper functions
  const userToken = extractUserToken(request, parsedParams)
  const clickAnalytics = extractClickAnalytics(parsedParams)
  const indices = extractIndices(parsedParams, [])
  const queryId = extractQueryId(responseBody)
  const hitsSample = extractHitsSample(responseBody)

  console.log('[DEBUG] Single search request parsed:', {
    userToken,
    clickAnalytics,
    indices,
    queryId,
    hitsSampleCount: hitsSample.length
  })

  return {
    id: generateRequestId('search'),
    time: new Date().toISOString(),
    requestId: request.requestId || generateRequestId('req'),
    url: request.url,
    method: request.method as 'POST' | 'GET',
    headers: request.headers || {},
    appId,
    indices,
    clickAnalytics,
    userToken,
    queryId,
    params: JSON.stringify(parsedParams),
    hitsSample,
    responseSnippet: responseBody.substring(0, 500),
    rawRequestBody: requestBody,
    isMultiRequest: false,
    requestIndex: 0,
    totalRequests: 1
  }
}

/**
 * Parse multi-search request and return array of individual SearchRequest objects
 */
function parseMultiSearchRequest(
  request: any,
  responseBody: string,
  parsedParams: any,
  appId: string
): SearchRequest[] {
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

  // Create individual SearchRequest objects for each request
  const searchRequests: SearchRequest[] = []

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
      const userToken = extractUserToken(request, { requests: [req] })
      const queryId = result.queryID || result.queryId
      const hitsSample = extractHitsSample(JSON.stringify(result))
      
      console.log(`[DEBUG] Multi-search request ${index} parsed:`, {
        indices,
        clickAnalytics,
        userToken,
        queryId,
        hitsSampleCount: hitsSample.length
      })
      
      const searchData: SearchRequest = {
        id: generateRequestId('search'),
        time: new Date().toISOString(),
        requestId: request.requestId || generateRequestId('req'),
        url: request.url,
        method: request.method as 'POST' | 'GET',
        headers: request.headers || {},
        appId,
        indices,
        clickAnalytics,
        userToken,
        queryId,
        params: JSON.stringify(req),
        hitsSample,
        responseSnippet: JSON.stringify(result).substring(0, 500),
        rawRequestBody: JSON.stringify(req, null, 2),
        isMultiRequest: true,
        requestIndex: index,
        totalRequests: requests.length,
        batchId
      }

      searchRequests.push(searchData)
    } catch (error) {
      console.error(`[ERROR] Failed to parse multi-search request ${index}:`, error)
    }
  })

  console.log(`[DEBUG] Created ${searchRequests.length} search requests`)
  return searchRequests
}

/**
 * Parse insights request
 */
export function parseInsightsRequest(
  request: any,
  responseBody: string
): EventRequest | null {
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
    
    const event = events[0]
    console.log('[DEBUG] Processing event:', {
      eventType: event.eventType,
      eventName: event.eventName,
      index: event.index,
      hasObjectIDs: !!event.objectIDs,
      hasObjectID: !!event.objectID,
      hasQueryID: !!event.queryID,
      hasUserToken: !!event.userToken
    })
    
    // Determine event type
    let eventType: 'click' | 'conversion' | 'view' | 'purchase' = 'view'
    if (event.eventType) {
      eventType = event.eventType
    } else if (event.eventName) {
      const name = event.eventName.toLowerCase()
      if (name.includes('click')) eventType = 'click'
      else if (name.includes('conversion') || name.includes('purchase') || name.includes('addtocart')) eventType = 'conversion'
      else if (name.includes('view')) eventType = 'view'
    }
    
    // Extract data
    const userToken = extractUserToken(request, parsedParams) || event.userToken
    const objectIDs = event.objectIDs || []
    if (event.objectID) objectIDs.push(event.objectID)
    const products = event.products || []
    
    console.log('[DEBUG] Event data extracted:', {
      eventType,
      userToken,
      objectIDsCount: objectIDs.length,
      productsCount: products.length,
      queryID: event.queryID
    })
    
    const eventRequest: EventRequest = {
      id: generateRequestId('event'),
      time: new Date().toISOString(),
      requestId: request.requestId || generateRequestId('req'),
      url: request.url,
      type: eventType,
      eventName: event.eventName || 'unknown',
      index: event.index || 'unknown',
      userToken,
      queryId: event.queryID,
      objectIDs: objectIDs.length > 0 ? objectIDs : undefined,
      products: products.length > 0 ? products : undefined,
      payloadSnippet: JSON.stringify(event).substring(0, 500)
    }
    
    console.log('[DEBUG] Event request created:', eventRequest)
    return eventRequest
  } catch (error) {
    console.error('[ERROR] Failed to parse insights request:', error)
    return null
  }
}
