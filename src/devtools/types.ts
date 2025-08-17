/**
 * Shared types for the Algolia Front End Validator extension
 * Now using the shared schema types for consistency
 */

// Re-export shared schema types
export type {
  Session,
  NetworkRequest,
  SearchRequest,
  SearchQuery,
  InsightsRequest,
  InsightsEvent
} from '../../shared/schema/types'

// Keep UI-specific types that aren't in the schema
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

// Update TabState to use new schema types
export interface TabState {
  tabId: number
  isCapturing: boolean
  startTime?: string
  searches: SearchRequest[]
  events: InsightsRequest[]
  issues: Issue[]
  expectations: Expectation[]
}

export interface AppState {
  tabs: Record<number, TabState>
  config: SessionConfig
  activeTabId?: number
}

// Legacy type for backward compatibility during transition
export type TrafficItem = NetworkRequest
