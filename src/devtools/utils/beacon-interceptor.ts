/**
 * Beacon interceptor to catch navigator.sendBeacon calls
 * This is injected into the page to intercept Algolia Insights events
 */

export function injectBeaconInterceptor() {
  // Store the original sendBeacon function
  const originalSendBeacon = navigator.sendBeacon
  
  // Override sendBeacon to intercept calls
  navigator.sendBeacon = function(url: string, data?: BodyInit | null): boolean {
    console.log('[BEACON] sendBeacon intercepted:', { url, data })
    
    // Check if this is an Algolia Insights request
    if (url.includes('insights.algolia.io') || url.includes('algolia')) {
      console.log('[BEACON] Algolia request detected, forwarding to extension')
      
      // Forward to our extension via postMessage
      window.postMessage({
        type: 'ALGOLIA_BEACON_REQUEST',
        url,
        data: data ? (typeof data === 'string' ? data : JSON.stringify(data)) : null,
        timestamp: Date.now()
      }, '*')
    }
    
    // Call the original function
    return originalSendBeacon.call(this, url, data)
  }
  
  console.log('[BEACON] Beacon interceptor injected successfully')
}
