/**
 * Utility functions for parsing search queries from Algolia request data
 */

/**
 * Extracts the actual search query text from request parameters
 * Handles both URL-encoded parameters and JSON request bodies
 */
export function extractSearchQuery(params: string): string {
  if (!params) return 'No query'
  
  try {
    // Try to parse as JSON first (for POST requests)
    if (params.startsWith('{') || params.startsWith('[')) {
      const parsed = JSON.parse(params)
      
      // Handle multi-search requests
      if (Array.isArray(parsed.requests)) {
        const queries = parsed.requests
          .map((req: any) => req.query || req.params?.query || 'No query')
          .filter((q: string) => q !== 'No query')
        return queries.length > 0 ? queries.join(', ') : 'Multi-search (no queries)'
      }
      
      // Handle single search requests
      if (parsed.query) return parsed.query
      if (parsed.params?.query) return parsed.params.query
    }
    
    // Try to parse as URL-encoded parameters (for GET requests)
    if (params.includes('=')) {
      const urlParams = new URLSearchParams(params)
      const query = urlParams.get('query')
      if (query) return decodeURIComponent(query)
    }
    
    // If it's a simple string, try to extract query from it
    if (params.includes('query=')) {
      const match = params.match(/query=([^&]+)/)
      if (match) return decodeURIComponent(match[1])
    }
    
    return 'Search request'
  } catch (error) {
    // If parsing fails, try to extract query from the raw string
    if (params.includes('query=')) {
      const match = params.match(/query=([^&\s]+)/)
      if (match) return decodeURIComponent(match[1])
    }
    
    return 'Search request'
  }
}

/**
 * Extracts additional search parameters for display
 */
export function extractSearchParams(params: string): string[] {
  if (!params) return []
  
  const extracted: string[] = []
  
  try {
    // Try to parse as JSON
    if (params.startsWith('{') || params.startsWith('[')) {
      const parsed = JSON.parse(params)
      
      if (Array.isArray(parsed.requests)) {
        // Multi-search - extract from first request
        const firstReq = parsed.requests[0]
        if (firstReq.hitsPerPage) extracted.push(`Hits: ${firstReq.hitsPerPage}`)
        if (firstReq.filters) extracted.push(`Filters: ${firstReq.filters}`)
      } else {
        // Single search
        if (parsed.hitsPerPage) extracted.push(`Hits: ${parsed.hitsPerPage}`)
        if (parsed.filters) extracted.push(`Filters: ${parsed.filters}`)
      }
    } else {
      // URL parameters
      const urlParams = new URLSearchParams(params)
      if (urlParams.get('hitsPerPage')) extracted.push(`Hits: ${urlParams.get('hitsPerPage')}`)
      if (urlParams.get('filters')) extracted.push(`Filters: ${urlParams.get('filters')}`)
    }
  } catch (error) {
    // Fallback parsing
    if (params.includes('hitsPerPage=')) {
      const match = params.match(/hitsPerPage=([^&]+)/)
      if (match) extracted.push(`Hits: ${match[1]}`)
    }
  }
  
  return extracted
}
