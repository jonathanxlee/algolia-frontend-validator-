import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { 
  AppState, 
  TabState, 
  SessionConfig, 
  SearchRequest, 
  InsightsRequest, 
  Issue, 
  Expectation 
} from '../devtools/types'
import { createEventIndex } from '../devtools/utils/traffic-helpers'

const DEFAULT_CONFIG: SessionConfig = {
  searchHosts: [
    'https://*.algolia.net',
    'https://*.algolianet.com'
  ],
  insightsHosts: [
    'https://insights.algolia.io',
    'https://insights.us.algolia.io',
    'https://insights.de.algolia.io'
  ],
  validateOnlyWhenClickAnalyticsTrue: false,
  expectationTimeoutSec: 120
}

interface AppActions {
  // Tab management
  setActiveTab: (tabId: number) => void
  initializeTab: (tabId: number) => void
  removeTab: (tabId: number) => void
  
  // Capture control
  startCapture: (tabId: number) => void
  stopCapture: (tabId: number) => void
  
  // Data management
  addSearch: (tabId: number, search: SearchRequest) => void
  addEvent: (tabId: number, event: InsightsRequest) => void
  addIssue: (tabId: number, issue: Issue) => void
  addExpectation: (tabId: number, expectation: Expectation) => void
  updateExpectation: (tabId: number, expectationId: string, updates: Partial<Expectation>) => void
  
  // Configuration
  updateConfig: (config: Partial<SessionConfig>) => void
  
  // Data clearing
  clearTabData: (tabId: number) => void
  clearAllData: () => void
  
  // ✅ NEW: Add action to rebuild index when events change
  rebuildEventIndex: (tabId: number) => void
}

export const useAppStore = create<AppState & AppActions>()(
  persist(
    (set, get) => ({
      tabs: {},
      config: DEFAULT_CONFIG,
      activeTabId: undefined,

      setActiveTab: (tabId: number) => {
        set({ activeTabId: tabId })
      },

      initializeTab: (tabId: number) => {
        console.log('[DEBUG] initializeTab called:', tabId)
        const { tabs } = get()
        if (!tabs[tabId]) {
          console.log('[DEBUG] Creating new tab:', tabId)
          set({
            tabs: {
              ...tabs,
              [tabId]: {
                tabId,
                isCapturing: false,
                searches: [],
                events: [],
                eventIndex: new Map(), // ✅ NEW: Initialize empty event index
                issues: [],
                expectations: []
              }
            }
          })
          console.log('[DEBUG] Tab created successfully:', tabId)
        } else {
          console.log('[DEBUG] Tab already exists:', tabId)
        }
      },

      removeTab: (tabId: number) => {
        const { tabs, activeTabId } = get()
        const newTabs = { ...tabs }
        delete newTabs[tabId]
        
        set({
          tabs: newTabs,
          activeTabId: activeTabId === tabId ? undefined : activeTabId
        })
      },

      startCapture: (tabId: number) => {
        const { tabs } = get()
        const tab = tabs[tabId]
        if (tab) {
          set({
            tabs: {
              ...tabs,
              [tabId]: {
                ...tab,
                isCapturing: true,
                startTime: new Date().toISOString()
              }
            }
          })
        }
      },

      stopCapture: (tabId: number) => {
        const { tabs } = get()
        const tab = tabs[tabId]
        if (tab) {
          set({
            tabs: {
              ...tabs,
              [tabId]: {
                ...tab,
                isCapturing: false
              }
            }
          })
        }
      },

      addSearch: (tabId: number, search: SearchRequest) => {
        const { tabs } = get()
        const tab = tabs[tabId]
        if (tab) {
          // Check for duplicates in the store using URL and timestamp
          const isDuplicate = tab.searches.some(existing => 
            existing.url === search.url && existing.ts === search.ts
          )
          
          if (isDuplicate) {
            return
          }
          
          set({
            tabs: {
              ...tabs,
              [tabId]: {
                ...tab,
                searches: [...tab.searches, search]
              }
            }
          })
        }
      },

      addEvent: (tabId: number, event: InsightsRequest) => {
        const { tabs } = get()
        const tab = tabs[tabId]
        if (tab) {
          // Check for duplicates in the store using URL and timestamp
          const isDuplicate = tab.events.some(existing => 
            existing.url === event.url && existing.ts === event.ts
          )
          
          if (isDuplicate) {
            return
          }
          
          const newEvents = [...tab.events, event]
          // ✅ NEW: Rebuild event index when events change
          const newEventIndex = createEventIndex(newEvents)
          
          set({
            tabs: {
              ...tabs,
              [tabId]: {
                ...tab,
                events: newEvents,
                eventIndex: newEventIndex
              }
            }
          })
        }
      },

      addIssue: (tabId: number, issue: Issue) => {
        const { tabs } = get()
        const tab = tabs[tabId]
        if (tab) {
          set({
            tabs: {
              ...tabs,
              [tabId]: {
                ...tab,
                issues: [...tab.issues, issue]
              }
            }
          })
        }
      },

      addExpectation: (tabId: number, expectation: Expectation) => {
        const { tabs } = get()
        const tab = tabs[tabId]
        if (tab) {
          set({
            tabs: {
              ...tabs,
              [tabId]: {
                ...tab,
                expectations: [...tab.expectations, expectation]
              }
            }
          })
        }
      },

      updateExpectation: (tabId: number, expectationId: string, updates: Partial<Expectation>) => {
        const { tabs } = get()
        const tab = tabs[tabId]
        if (tab) {
          const updatedExpectations = tab.expectations.map(exp => 
            exp.id === expectationId ? { ...exp, ...updates } : exp
          )
          set({
            tabs: {
              ...tabs,
              [tabId]: {
                ...tab,
                expectations: updatedExpectations
              }
            }
          })
        }
      },

      updateConfig: (config: Partial<SessionConfig>) => {
        set((state) => ({
          config: { ...state.config, ...config }
        }))
      },

      clearTabData: (tabId: number) => {
        const { tabs } = get()
        const tab = tabs[tabId]
        if (tab) {
          set({
            tabs: {
              ...tabs,
              [tabId]: {
                ...tab,
                searches: [],
                events: [],
                eventIndex: new Map(), // ✅ NEW: Reset event index
                issues: [],
                expectations: []
              }
            }
          })
        }
      },

      clearAllData: () => {
        set({
          tabs: {},
          activeTabId: undefined
        })
      },

      // ✅ NEW: Action to rebuild event index
      rebuildEventIndex: (tabId: number) => {
        const { tabs } = get()
        const tab = tabs[tabId]
        if (tab) {
          const newEventIndex = createEventIndex(tab.events)
          set({
            tabs: {
              ...tabs,
              [tabId]: {
                ...tab,
                eventIndex: newEventIndex
              }
            }
          })
        }
      }
    }),
    {
      name: 'algolia-validator-storage',
      partialize: (state) => ({ config: state.config }),
      version: 1,
      migrate: (persistedState: any, version: number) => {
        // Handle migration from version 0 to 1
        if (version === 0) {
          // Convert old state format to new format
          return {
            tabs: {},
            config: persistedState.config || DEFAULT_CONFIG,
            activeTabId: undefined
          }
        }
        return persistedState
      }
    }
  )
)
