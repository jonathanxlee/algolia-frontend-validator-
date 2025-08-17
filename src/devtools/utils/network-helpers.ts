/**
 * Network request processing utilities for DevTools panel
 */

export interface ParsedRequestData {
  body: string
  parsedParams: any
  isMultiRequest: boolean
  requestsCount: number
}

/**
 * Extract request body from chrome.devtools.network request object
 */
export function extractRequestBody(postData: any): string {
  if (!postData) return '{}'

  if (typeof postData === 'string') {
    return postData
  }

  // Handle chrome.devtools.network postData structure
  if (postData.text) return postData.text
  if (postData.params) return postData.params
  if (postData.raw) return postData.raw

  // Fallback: stringify the object
  return JSON.stringify(postData)
}

/**
 * Parse request parameters with fallback strategies
 */
export function parseRequestParams(body: string, contentType?: string): any {
  try {
    // Try direct JSON parsing first
    return JSON.parse(body)
  } catch {
    // Try URL-encoded format
    try {
      const urlParams = new URLSearchParams(body)
      const requestsParam = urlParams.get('requests')
      if (requestsParam) {
        return JSON.parse(requestsParam)
      }
      // For single requests, return the parsed URL params
      const params: Record<string, string> = {}
      urlParams.forEach((value, key) => {
        params[key] = value
      })
      return params
    } catch {
      // Final attempt: parse body as JSON despite content-type
      try {
        return JSON.parse(body)
      } catch {
        return {}
      }
    }
  }

  return {}
}

/**
 * Detect if request is a multi-request format
 */
export function isMultiRequestFormat(parsedParams: any): boolean {
  return parsedParams.requests && 
         Array.isArray(parsedParams.requests) && 
         parsedParams.requests.length >= 1
}

/**
 * Extract user token from request headers or params
 * Now supports per-query userToken extraction for multi-request scenarios
 */
export function extractUserToken(request: any, parsedParams: any): string | undefined {
  // Check headers first
  if (request.headers) {
    const headerToken = request.headers['X-Algolia-UserToken'] || 
                       request.headers['x-algolia-usertoken']
    if (headerToken) return headerToken
  }
  
  // For multi-request format, extract from individual requests
  if (parsedParams.requests && Array.isArray(parsedParams.requests)) {
    // This function is called for the overall request, so we return the header token
    // Individual query userTokens are extracted separately in parseMultiSearchRequest
    return undefined
  }
  
  // For single requests, check params string for userToken
  if (parsedParams.params) {
    const userTokenMatch = parsedParams.params.match(/userToken=([^&]+)/)
    if (userTokenMatch) {
      return decodeURIComponent(userTokenMatch[1])
    }
  }
  
  // Check if userToken is a direct property (for both JSON and URL-encoded requests)
  if (parsedParams.userToken !== undefined) {
    return parsedParams.userToken
  }
  
  return undefined
}

/**
 * Extract user token for a specific query in a multi-request
 * Priority: query userToken > header userToken > undefined
 */
export function extractQueryUserToken(
  queryData: any, 
  headerUserToken?: string
): string | undefined {
  // First check if this specific query has a userToken
  if (queryData.userToken !== undefined) {
    return queryData.userToken
  }
  
  // Check if userToken is in the params string
  if (queryData.params) {
    const userTokenMatch = queryData.params.match(/userToken=([^&]*)/)
    if (userTokenMatch) {
      const value = userTokenMatch[1]
      // Preserve empty strings, only treat missing parameter as undefined
      return value === '' ? '' : decodeURIComponent(value)
    }
  }
  
  // Fallback to header userToken
  return headerUserToken
}

/**
 * Extract click analytics setting from params
 */
export function extractClickAnalytics(parsedParams: any): boolean {
  if (parsedParams.requests && Array.isArray(parsedParams.requests)) {
    const firstRequest = parsedParams.requests[0]
    if (firstRequest.params) {
      return firstRequest.params.includes('clickAnalytics=true')
    }
  }
  return false
}

/**
 * Extract index names from request
 */
export function extractIndices(parsedParams: any, urlIndices: string[]): string[] {
  if (urlIndices.length > 0) return urlIndices
  
  if (parsedParams.requests && Array.isArray(parsedParams.requests)) {
    const firstRequest = parsedParams.requests[0]
    if (firstRequest.params) {
      const indexMatch = firstRequest.params.match(/indexName=([^&]+)/)
      if (indexMatch) {
        return [decodeURIComponent(indexMatch[1])]
      }
    }
  }
  
  return []
}

/**
 * Extract index names from URL path
 */
export function extractIndicesFromUrl(url: string): string[] {
  try {
    // Pattern: /1/indexes/{indexName}/query or /1/indexes/{indexName}/queries
    const urlMatch = url.match(/\/1\/indexes\/([^\/]+)\/(query|queries)/)
    if (urlMatch) {
      return [decodeURIComponent(urlMatch[1])]
    }
    
    // Alternative pattern: /1/indexes/{indexName}
    const altMatch = url.match(/\/1\/indexes\/([^\/\?]+)/)
    if (altMatch) {
      return [decodeURIComponent(altMatch[1])]
    }
  } catch (error) {
    console.log('[DEBUG] Error extracting indices from URL:', error)
  }
  
  return []
}

/**
 * Extract query ID from response body
 */
export function extractQueryId(responseBody: string): string | undefined {
  if (!responseBody || responseBody.trim() === '') {
    return undefined
  }
  
  try {
    const responseData = JSON.parse(responseBody)
    return responseData.queryID || responseData.queryId
  } catch {
    return undefined
  }
}

/**
 * Extract sample hits from response body
 */
export function extractHitsSample(responseBody: string): string[] {
  try {
    const responseData = JSON.parse(responseBody)
    if (responseData.hits && Array.isArray(responseData.hits)) {
      return responseData.hits
        .slice(0, 5)
        .map((hit: any) => hit.objectID || '')
        .filter(Boolean)
    }
  } catch {
    // Ignore parsing errors
  }
  return []
}

/**
 * Generate unique ID for requests
 */
export function generateRequestId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generate batch ID for multi-requests
 */
export function generateBatchId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
