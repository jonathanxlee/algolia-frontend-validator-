/**
 * Specialized parser for Algolia's nested URL-encoded params
 * Handles the gotcha where JSON requests contain params as URL-encoded strings
 * Now properly leverages URL and URLSearchParams APIs
 */

export interface AlgoliaSearchParams {
  query?: string
  filters?: string
  facets?: string[]
  hitsPerPage?: number
  page?: number
  clickAnalytics?: boolean
  userToken?: string
  [key: string]: any // Allow for other Algolia parameters
}

export class AlgoliaParamsParser {
  /**
   * Parse Algolia params string into structured object
   * Handles URL-encoded parameters within JSON requests
   * Uses URLSearchParams for robust parsing
   */
  static parseParams(paramsString: string): AlgoliaSearchParams {
    if (!paramsString || typeof paramsString !== 'string') {
      return {}
    }

    try {
      const urlParams = new URLSearchParams(paramsString)
      const result: AlgoliaSearchParams = {}

      // Parse each parameter with proper type conversion
      urlParams.forEach((value, key) => {
        result[key] = this.parseParamValue(key, value)
      })

      return result
    } catch (error) {
      console.warn('[AlgoliaParamsParser] Failed to parse params string:', paramsString, error)
      // Fallback to regex parsing for malformed strings
      return this.fallbackParseParams(paramsString)
    }
  }

  /**
   * Parse individual parameter value with proper type conversion
   */
  private static parseParamValue(key: string, value: string): any {
    // Handle boolean parameters
    if (key === 'clickAnalytics') {
      return value === 'true'
    }

    // Handle numeric parameters
    if (['hitsPerPage', 'page', 'maxValuesPerFacet', 'minWordSizefor1Typo', 'minWordSizefor2Typos'].includes(key)) {
      const num = parseInt(value, 10)
      return isNaN(num) ? value : num
    }

    // Handle array parameters (comma-separated)
    if (['facets', 'attributesToRetrieve', 'attributesToHighlight', 'attributesToSnippet'].includes(key)) {
      return value.split(',').map(v => v.trim()).filter(Boolean)
    }

    // Handle filters (special Algolia syntax)
    if (key === 'filters') {
      return value // Keep as-is, filters have complex syntax
    }

    // Default: return as string (preserving empty strings)
    return value
  }

  /**
   * Fallback parsing for malformed params strings
   */
  private static fallbackParseParams(paramsString: string): AlgoliaSearchParams {
    const result: AlgoliaSearchParams = {}
    
    // Simple regex-based parsing as fallback
    const paramRegex = /([^&=]+)=([^&]*)/g
    let match

    while ((match = paramRegex.exec(paramsString)) !== null) {
      const [, key, value] = match
      result[key] = decodeURIComponent(value)
    }

    return result
  }

  /**
   * Extract specific parameter with fallback
   * Uses URLSearchParams.get() for clean extraction
   */
  static getParam(paramsString: string, paramName: string): string | undefined {
    try {
      const urlParams = new URLSearchParams(paramsString)
      return urlParams.get(paramName) || undefined
    } catch {
      // Fallback to regex
      const match = paramsString.match(new RegExp(`${paramName}=([^&]*)`))
      return match ? decodeURIComponent(match[1]) : undefined
    }
  }

  /**
   * Check if params string contains specific parameter
   * Uses URLSearchParams.has() for clean checking
   */
  static hasParam(paramsString: string, paramName: string): boolean {
    try {
      const urlParams = new URLSearchParams(paramsString)
      return urlParams.has(paramName)
    } catch {
      // Fallback to regex
      return new RegExp(`${paramName}=`).test(paramsString)
    }
  }

  /**
   * Get all parameter names from params string
   * Uses URLSearchParams.keys() for clean extraction
   */
  static getParamNames(paramsString: string): string[] {
    try {
      const urlParams = new URLSearchParams(paramsString)
      return Array.from(urlParams.keys())
    } catch {
      // Fallback to regex
      const matches = paramsString.match(/([^&=]+)=/g)
      return matches ? matches.map(m => m.slice(0, -1)) : []
    }
  }

  /**
   * Validate if params string is well-formed
   * Uses URLSearchParams constructor for validation
   */
  static isValidParams(paramsString: string): boolean {
    if (paramsString === '') {
      return true // Empty string is valid
    }
    
    if (typeof paramsString !== 'string') {
      return false
    }

    try {
      // Let URLSearchParams handle the validation
      new URLSearchParams(paramsString)
      return true
    } catch {
      return false
    }
  }

  /**
   * Reconstruct params string from parsed object
   * Uses URLSearchParams for clean reconstruction
   * Handles array parameters without unwanted URL encoding
   */
  static reconstructParams(params: AlgoliaSearchParams): string {
    const urlParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          // For array values, we want to preserve commas without URL encoding
          // URLSearchParams will encode commas, so we need to handle this specially
          const arrayValue = value.join(',')
          // Set the raw value and then manually reconstruct to avoid encoding
          urlParams.set(key, arrayValue)
        } else {
          urlParams.set(key, String(value))
        }
      }
    })

    // URLSearchParams.toString() encodes commas, so we need to decode them back
    let result = urlParams.toString()
    
    // Decode commas in array values for readability
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        const encodedKey = encodeURIComponent(key)
        const encodedValue = encodeURIComponent(value.join(','))
        const searchPattern = `${encodedKey}=${encodedValue}`
        const replacePattern = `${key}=${value.join(',')}`
        result = result.replace(searchPattern, replacePattern)
      }
    })

    return result
  }

  /**
   * Parse full URL and extract search params
   * Uses URL class for full URL parsing
   */
  static parseUrl(urlString: string): { baseUrl: string; params: AlgoliaSearchParams } {
    try {
      const url = new URL(urlString)
      const params = this.parseParams(url.search.substring(1)) // Remove leading '?'
      
      return {
        baseUrl: `${url.origin}${url.pathname}`,
        params
      }
    } catch (error) {
      console.warn('[AlgoliaParamsParser] Failed to parse URL:', urlString, error)
      return {
        baseUrl: urlString,
        params: {}
      }
    }
  }

  /**
   * Build URL with search params
   * Uses URL and URLSearchParams for clean construction
   */
  static buildUrl(baseUrl: string, params: AlgoliaSearchParams): string {
    try {
      const url = new URL(baseUrl)
      const urlParams = new URLSearchParams(url.search)

      // Add new params
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            urlParams.set(key, value.join(','))
          } else {
            urlParams.set(key, String(value))
          }
        }
      })

      url.search = urlParams.toString()
      return url.toString()
    } catch (error) {
      console.warn('[AlgoliaParamsParser] Failed to build URL:', baseUrl, error)
      // Fallback to manual construction
      const paramString = this.reconstructParams(params)
      return paramString ? `${baseUrl}?${paramString}` : baseUrl
    }
  }
}
