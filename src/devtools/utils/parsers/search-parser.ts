/**
 * Specialized parser for search requests
 * Handles both single and multi-search scenarios
 */

import { BaseParser, ParsingContext, ParsingResult } from './base-parser'
import { UserTokenExtractor, UserTokenContext } from './user-token-extractor'
import { AlgoliaParamsParser } from './algolia-params-parser'
import type { SearchRequest, SearchQuery } from '../../types'
import { generateRequestId, extractIndicesFromUrl } from '../network-helpers'

export interface SearchParsingOptions {
  preserveOriginalBody?: boolean
  validateResponse?: boolean
  extractHits?: boolean
}

export class SearchParser extends BaseParser {
  private userTokenExtractor: UserTokenExtractor

  constructor() {
    super()
    this.userTokenExtractor = new UserTokenExtractor()
  }

  /**
   * Parse search request and return SearchRequest with nested queries
   */
  parseSearchRequest(
    context: ParsingContext,
    options: SearchParsingOptions = {}
  ): ParsingResult<SearchRequest> {
    try {
      const { request, responseBody, appId, timestamp } = context
      
      // Extract and parse request data
      const requestBody = this.extractRequestBody(request.postData)
      const parsedParams = this.parseRequestParams(requestBody)
      
      // Check if this is a multi-request format
      if (this.isMultiRequestFormat(parsedParams)) {
        return this.parseMultiSearchRequest(context, parsedParams, options)
      } else {
        return this.parseSingleSearchRequest(context, parsedParams, options)
      }
    } catch (error) {
      this.logError('Failed to parse search request', error)
      return this.createResult<SearchRequest>(false, undefined, 'Parsing failed', [])
    }
  }

  /**
   * Parse single search request
   */
  private parseSingleSearchRequest(
    context: ParsingContext,
    parsedParams: any,
    options: SearchParsingOptions
  ): ParsingResult<SearchRequest> {
    const { request, responseBody, appId, timestamp } = context
    
    // Extract userToken context
    const headerToken = this.extractHeaderUserToken(request)
    const userToken = this.userTokenExtractor.extractUserTokenFromSingleRequest(
      request, parsedParams, headerToken
    )

    // Extract other data
    const clickAnalytics = this.extractClickAnalytics(parsedParams)
    const indices = extractIndicesFromUrl(request.url)
    const queryId = responseBody ? this.extractQueryId(responseBody) : undefined

    // Create the nested structure
    const searchQuery: SearchQuery = {
      id: generateRequestId('query'),
      index: indices[0] || 'unknown',
      params: options.preserveOriginalBody ? 
        this.extractRequestBody(request.postData) : 
        JSON.stringify(parsedParams),
      queryID: queryId,
      userToken,
      clickAnalytics
    }

    const searchRequest: SearchRequest = {
      type: 'search_request',
      ts: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
      url: request.url,
      method: request.method as 'GET' | 'POST',
      appId: appId || 'unknown',
      requestHeaders: this.extractHeaders(request),
      requestBody: this.extractRequestBody(request.postData),
      responseStatus: 200, // Default, could be extracted from response
      responseHeaders: {}, // Could be extracted from response
      responseBody,
      queries: [searchQuery]
    }

    return this.createResult<SearchRequest>(true, searchRequest)
  }

  /**
   * Parse multi-search request and return SearchRequest with multiple queries
   */
  private parseMultiSearchRequest(
    context: ParsingContext,
    parsedParams: any,
    options: SearchParsingOptions
  ): ParsingResult<SearchRequest> {
    const { request, responseBody, appId, timestamp } = context
    const requests = parsedParams.requests
    
    // Extract userToken context
    const userTokenContext = this.userTokenExtractor.extractUserTokenContext(request, parsedParams)
    
    // Validate userToken consistency
    const warnings = this.userTokenExtractor.validateUserTokenConsistency(userTokenContext)
    
    // Parse response to get results array
    let results: any[] = []
    try {
      const responseData = this.safeJsonParse(responseBody)
      results = responseData.results || []
    } catch {
      this.logWarning('Could not parse response body for results')
    }

    // Create individual SearchQuery objects for each request
    const searchQueries: SearchQuery[] = []

    requests.forEach((req: any, index: number) => {
      try {
        const result = results[index]
        if (!result) {
          this.logWarning(`No result for request ${index}`)
          return // Skip if no matching result
        }
        
        // Extract data for this individual request
        const indices = req.indexName ? [req.indexName] : []
        const clickAnalytics = req.params ? req.params.includes('clickAnalytics=true') : false
        const userToken = this.userTokenExtractor.getUserTokenForQuery(userTokenContext, index)
        const queryId = result.queryID || result.queryId
        
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
        this.logError(`Failed to parse multi-search request ${index}`, error)
      }
    })

    const searchRequest: SearchRequest = {
      type: 'search_request',
      ts: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
      url: request.url,
      method: request.method as 'GET' | 'POST',
      appId: appId || 'unknown',
      requestHeaders: this.extractHeaders(request),
      requestBody: JSON.stringify(parsedParams),
      responseStatus: 200,
      responseHeaders: {},
      responseBody,
      queries: searchQueries
    }

    return this.createResult<SearchRequest>(true, searchRequest, undefined, warnings)
  }

  /**
   * Detect if request is a multi-request format
   */
  private isMultiRequestFormat(parsedParams: any): boolean {
    return parsedParams.requests && 
           Array.isArray(parsedParams.requests) && 
           parsedParams.requests.length >= 1
  }

  /**
   * Extract click analytics setting from params
   * Now properly handles Algolia's nested URL-encoded params
   */
  private extractClickAnalytics(parsedParams: any): boolean {
    if (parsedParams.requests && Array.isArray(parsedParams.requests)) {
      const firstRequest = parsedParams.requests[0]
      if (firstRequest.params) {
        // Use AlgoliaParamsParser for proper handling of nested URL-encoded params
        const parsedParamsObj = AlgoliaParamsParser.parseParams(firstRequest.params)
        return parsedParamsObj.clickAnalytics === true
      }
    }
    return false
  }

  /**
   * Extract query ID from response body
   */
  private extractQueryId(responseBody: string): string | undefined {
    if (!responseBody || responseBody.trim() === '') {
      return undefined
    }
    
    try {
      const responseData = this.safeJsonParse(responseBody)
      return responseData.queryID || responseData.queryId
    } catch {
      return undefined
    }
  }
}
