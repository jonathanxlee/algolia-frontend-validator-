import { AlgoliaParamsParser } from './algolia-params-parser'

/**
 * Specialized class for extracting userToken from various sources
 * Handles complex scenarios with per-query userToken and header fallbacks
 * Now properly handles Algolia's nested URL-encoded params
 */

export interface UserTokenContext {
  headerToken?: string
  bodyTokens: Map<number, string> // queryIndex -> userToken
}

export interface UserTokenSource {
  source: 'header' | 'body' | 'params' | 'nested'
  value: string
  queryIndex?: number
}

export class UserTokenExtractor {
  /**
   * Extract userToken context from request
   * Returns header token and map of body tokens by query index
   */
  extractUserTokenContext(request: any, parsedParams: any): UserTokenContext {
    const headerToken = this.extractHeaderUserToken(request)
    const bodyTokens = this.extractBodyUserTokens(parsedParams)
    
    return { headerToken, bodyTokens }
  }

  /**
   * Get userToken for specific query index
   * Priority: body token > header token > undefined
   */
  getUserTokenForQuery(context: UserTokenContext, queryIndex: number): string | undefined {
    return context.bodyTokens.get(queryIndex) || context.headerToken
  }

  /**
   * Extract userToken from request headers
   */
  private extractHeaderUserToken(request: any): string | undefined {
    if (!request.headers) return undefined
    
    return request.headers['X-Algolia-UserToken'] || 
           request.headers['x-algolia-usertoken']
  }

  /**
   * Extract userToken from request body for multi-query requests
   * Handles both direct userToken properties and params string parsing
   */
  private extractBodyUserTokens(parsedParams: any): Map<number, string> {
    const bodyTokens = new Map<number, string>()
    
    if (!parsedParams.requests || !Array.isArray(parsedParams.requests)) {
      return bodyTokens
    }

    parsedParams.requests.forEach((req: any, index: number) => {
      const userToken = this.extractUserTokenFromRequest(req)
      if (userToken !== undefined) {
        bodyTokens.set(index, userToken)
      }
    })

    return bodyTokens
  }

  /**
   * Extract userToken from individual request object
   * Priority: direct userToken > params string > undefined
   * Handles nested URL-encoded params within JSON requests
   */
  private extractUserTokenFromRequest(request: any): string | undefined {
    // Check if userToken is a direct property
    if (request.userToken !== undefined) {
      return request.userToken
    }

    // Check if userToken is in the nested params string (Algolia-specific gotcha)
    if (request.params) {
      // Use AlgoliaParamsParser for proper handling of nested URL-encoded params
      const parsedParams = AlgoliaParamsParser.parseParams(request.params)
      if (parsedParams.userToken !== undefined) {
        return parsedParams.userToken
      }
    }

    return undefined
  }

  /**
   * Extract userToken from single request (non-multi-query)
   * Priority: direct userToken > params string > header fallback
   * Handles nested URL-encoded params within JSON requests
   */
  extractUserTokenFromSingleRequest(
    request: any, 
    parsedParams: any, 
    headerToken?: string
  ): string | undefined {
    // Check if userToken is a direct property
    if (parsedParams.userToken !== undefined) {
      return parsedParams.userToken
    }

    // Check if userToken is in the nested params string (Algolia-specific gotcha)
    if (parsedParams.params) {
      // Use AlgoliaParamsParser for proper handling of nested URL-encoded params
      const parsedParamsObj = AlgoliaParamsParser.parseParams(parsedParams.params)
      if (parsedParamsObj.userToken !== undefined) {
        return parsedParamsObj.userToken
      }
    }

    // Fallback to header userToken
    return headerToken
  }

  /**
   * Validate userToken consistency across queries
   * Returns warnings for inconsistent usage patterns
   */
  validateUserTokenConsistency(context: UserTokenContext): string[] {
    const warnings: string[] = []
    
    if (context.bodyTokens.size === 0) {
      return warnings // No body tokens to validate
    }

    const bodyTokenValues = Array.from(context.bodyTokens.values())
    const uniqueBodyTokens = new Set(bodyTokenValues)
    
    // Check if some queries have userToken and others don't
    const hasMixedUsage = context.bodyTokens.size < context.bodyTokens.size + 
                          (context.headerToken ? 1 : 0)
    
    if (hasMixedUsage) {
      warnings.push('Mixed userToken usage detected: some queries have userToken, others use header fallback')
    }

    // Check if multiple different userTokens are used in the same batch
    if (uniqueBodyTokens.size > 1) {
      warnings.push(`Multiple different userTokens detected in batch: ${Array.from(uniqueBodyTokens).join(', ')}`)
    }

    return warnings
  }

  /**
   * Get all userToken sources for debugging
   */
  getAllUserTokenSources(context: UserTokenContext): UserTokenSource[] {
    const sources: UserTokenSource[] = []
    
    if (context.headerToken) {
      sources.push({
        source: 'header',
        value: context.headerToken
      })
    }

    context.bodyTokens.forEach((userToken, queryIndex) => {
      sources.push({
        source: 'body',
        value: userToken,
        queryIndex
      })
    })

    return sources
  }
}
