/**
 * Base parser class providing common functionality for all request parsers
 */

export interface ParsingContext {
  request: any
  responseBody: string
  appId?: string
  timestamp?: number
}

export interface ParsingResult<T> {
  success: boolean
  data?: T
  error?: string
  warnings?: string[]
}

export abstract class BaseParser {
  /**
   * Extract user token from request headers
   */
  protected extractHeaderUserToken(request: any): string | undefined {
    if (!request.headers) return undefined
    
    return request.headers['X-Algolia-UserToken'] || 
           request.headers['x-algolia-usertoken']
  }

  /**
   * Extract and normalize request headers
   */
  protected extractHeaders(request: any): Record<string, string> {
    if (!request.headers) return {}
    
    const normalized: Record<string, string> = {}
    Object.entries(request.headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        normalized[key.toLowerCase()] = value
      }
    })
    
    return normalized
  }

  /**
   * Safely parse JSON with error handling
   */
  protected safeJsonParse(body: string): any {
    if (!body || body.trim() === '') return {}
    
    try {
      return JSON.parse(body)
    } catch (error) {
      console.warn('[BaseParser] JSON parsing failed:', error)
      return {}
    }
  }

  /**
   * Validate required fields in parsed data
   */
  protected validateRequiredFields(data: any, fields: string[]): boolean {
    return fields.every(field => data[field] !== undefined)
  }

  /**
   * Extract request body with fallback strategies
   */
  protected extractRequestBody(postData: any): string {
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
  protected parseRequestParams(body: string): any {
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
  }

  /**
   * Create a standardized parsing result
   */
  protected createResult<T>(
    success: boolean, 
    data?: T, 
    error?: string, 
    warnings?: string[]
  ): ParsingResult<T> {
    return { success, data, error, warnings }
  }

  /**
   * Log parsing warnings for debugging
   */
  protected logWarning(message: string, context?: any): void {
    console.warn(`[${this.constructor.name}] ${message}`, context)
  }

  /**
   * Log parsing errors for debugging
   */
  protected logError(message: string, error?: any): void {
    console.error(`[${this.constructor.name}] ${message}`, error)
  }
}
