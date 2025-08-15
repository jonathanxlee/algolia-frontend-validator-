/**
 * Shared types for the Algolia Front End Validator extension
 * Used by both popup and DevTools components
 */

export interface SearchRequest {
  id: string
  time: string
  requestId: string
  url: string
  method: 'POST' | 'GET'
  headers: Record<string, string>
  appId: string
  indices: string[]
  clickAnalytics: boolean
  userToken?: string
  queryId?: string
  params: string
  hitsSample: string[]
  responseSnippet: string
  rawRequestBody?: string
  isMultiRequest?: boolean
  requestIndex?: number
  totalRequests?: number
  batchId?: string
}

export interface EventRequest {
  id: string
  time: string
  requestId: string
  url: string
  type: 'click' | 'conversion' | 'view' | 'purchase'
  eventName: string
  index: string
  userToken?: string
  queryId?: string
  objectIDs?: string[]
  products?: any[]
  payloadSnippet: string
}

export type TrafficItem = SearchRequest | EventRequest

export interface Issue {
  id: string
  severity: 'error' | 'warning' | 'info'
  message: string
  suggestion?: string
  timestamp: string
}

export interface Expectation {
  id: string
  description: string
  queryId?: string
  userToken?: string
  expectedEvents: string[]
  timeout: number
  createdAt: string
  status: 'pending' | 'fulfilled' | 'timeout'
}

export interface SessionConfig {
  searchHosts: string[]
  insightsHosts: string[]
  validateOnlyWhenClickAnalyticsTrue: boolean
  expectationTimeoutSec: number
}

export interface TabState {
  tabId: number
  isCapturing: boolean
  startTime?: string
  searches: SearchRequest[]
  events: EventRequest[]
  issues: Issue[]
  expectations: Expectation[]
}

export interface AppState {
  tabs: Record<number, TabState>
  config: SessionConfig
  activeTabId?: number
}
