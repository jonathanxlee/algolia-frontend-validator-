# Algolia Frontend Validator - Project Structure & Architecture

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Chrome Extension (MV3)                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │   Background    │    │   DevTools      │    │   Content   │ │
│  │   Service       │◄──►│   Panel         │    │   Scripts   │ │
│  │   Worker        │    │   (React App)   │    │   (None)    │ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 File Structure

```
insights-validator/
├── 📄 manifest.json                 # Extension configuration
├── 📄 vite.config.ts               # Build configuration
├── 📄 package.json                  # Dependencies & scripts
├── 📄 jest.config.cjs              # Testing configuration
├── 📄 NOTES.md                      # Development notes
├── 📄 PROJECT_STRUCTURE.md          # This file
│
├── 📁 src/
│   ├── 📁 background/               # Service Worker (Background Script)
│   │   └── 📄 index.ts              # Chrome debugger API integration
│   │
│   ├── 📁 devtools/                 # DevTools Panel Implementation
│   │   ├── 📄 index.html            # Panel HTML entry point
│   │   ├── 📄 index.tsx             # React app entry point
│   │   ├── 📄 index.css             # Panel styling
│   │   ├── 📄 types.ts              # TypeScript interfaces
│   │   │
│   │   ├── 📁 pages/                # Main view components
│   │   │   ├── 📄 devtools-panel.tsx    # Main panel container
│   │   │   ├── 📄 live-traffic.tsx      # Live traffic view
│   │   │   ├── 📄 correlations.tsx      # Correlations view
│   │   │   ├── 📄 issues.tsx            # Issues view
│   │   │   ├── 📄 expectations.tsx      # Expectations view
│   │   │   └── 📄 settings.tsx          # Settings view
│   │   │
│   │   ├── 📁 components/            # Reusable UI components
│   │   │   ├── 📄 traffic-card.tsx      # Traffic item wrapper
│   │   │   ├── 📄 search-card.tsx       # Search request card
│   │   │   ├── 📄 event-card.tsx        # Event request card
│   │   │   ├── 📄 batch-header.tsx      # Multi-query batch header
│   │   │   ├── 📄 batch-group.tsx       # Batch grouping container
│   │   │   ├── 📄 navigation.tsx        # Tab navigation
│   │   │   └── 📄 devtools-header.tsx   # Panel header with controls
│   │   │
│   │   └── 📁 utils/                 # Utility functions
│   │       ├── 📄 traffic-grouping.ts   # Traffic hierarchy logic
│   │       ├── 📄 request-parsers.ts     # Network request parsing
│   │       ├── 📄 network-helpers.ts     # Network utility functions
│   │       ├── 📄 query-parser.ts        # Search query parsing
│   │       └── 📄 display-helpers.ts     # UI display utilities
│   │
│   ├── 📁 store/                    # State Management (Zustand)
│   │   └── 📄 index.ts              # Global state store
│   │
│   └── 📁 __tests__/                # Test files
│       └── 📄 traffic-grouping.test.ts  # Traffic grouping tests
│
├── 📁 dist/                         # Built extension files
└── 📁 .git/                         # Git repository
```

## 🔄 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Chrome Debugger API                          │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │ Network.request │    │ Network.response│    │ Network.load│ │
│  │ WillBeSent      │    │ Received        │    │ ingFinished │ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Background Service Worker                    │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │ handleDebugger  │    │ isAlgoliaRequest│    │ notifyDev   │ │
│  │ Event()         │    │ ()              │    │ Tools()     │ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Message Passing                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │ ALGOLIA_REQUEST │    │ ALGOLIA_SEARCH  │    │ ALGOLIA_    │ │
│  │ _DETECTED       │    │ _RESPONSE       │    │ INSIGHTS_   │ │
│  └─────────────────┘    └─────────────────┘    │ REQUEST     │ │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DevTools Panel                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │ Message Listener│    │ Request Parsers │    │ State Store │ │
│  │ handleBackground│    │ parseSearch     │    │ addSearch   │ │
│  │ Message()       │    │ Request()       │    │ addEvent()  │ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Traffic Grouping                            │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │ groupTrafficBy  │    │ Sort by Time    │    │ Create      │ │
│  │ QueryId()       │    │ (newest first)  │    │ Hierarchy   │ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    UI Rendering                                │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │ LiveTraffic     │    │ TrafficCard     │    │ SearchCard  │ │
│  │ Component       │    │ Components      │    │ EventCard   │ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 🧩 Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DevTools Panel                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │ DevToolsHeader  │    │ Navigation      │    │ MainContent │ │
│  │ (Start/Stop)    │    │ (Tab Switcher)  │    │ (Views)     │ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Live Traffic View                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │ Traffic Header  │    │ Traffic Cards   │    │ Batch Groups│ │
│  │ (Title/Count)   │    │ (Individual)    │    │ (Multi-Query)│ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Card Components                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │ TrafficCard     │    │ SearchCard      │    │ EventCard   │ │
│  │ (Wrapper)       │    │ (Search Data)   │    │ (Event Data)│ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 🔧 Key Technologies & Dependencies

### Core Technologies
- **Chrome Extension MV3** - Manifest version 3
- **React 18** - UI framework with TypeScript
- **Vite** - Build tool with CRXJS plugin
- **Zustand** - State management
- **Jest** - Testing framework

### Chrome APIs Used
- `chrome.debugger` - Network traffic interception
- `chrome.devtools.panels` - DevTools panel creation
- `chrome.runtime` - Message passing
- `chrome.tabs` - Tab management

### Key Features
- **Real-time traffic monitoring** via Chrome debugger
- **Algolia request detection** and parsing
- **Hierarchical traffic display** with search/event relationships
- **Batch request grouping** for multi-search operations
- **Card-based UI** optimized for DevTools panel

## 🚀 Integration Points for New Services

### 1. **Background Service Worker**
- **Location**: `src/background/index.ts`
- **Purpose**: Network traffic interception and processing
- **Integration**: Add new request type detection and handling

### 2. **Request Parsers**
- **Location**: `src/devtools/utils/request-parsers.ts`
- **Purpose**: Parse network requests into structured data
- **Integration**: Add new parsing functions for different services

### 3. **Traffic Grouping**
- **Location**: `src/devtools/utils/traffic-grouping.ts`
- **Purpose**: Organize traffic into hierarchical display structure
- **Integration**: Extend grouping logic for new traffic types

### 4. **State Management**
- **Location**: `src/store/index.ts`
- **Purpose**: Global state for tabs, traffic, and configuration
- **Integration**: Add new state types and actions

### 5. **UI Components**
- **Location**: `src/devtools/components/`
- **Purpose**: Display traffic data in user-friendly format
- **Integration**: Create new card types for different services

## 📋 Integration Checklist for New Services

- [ ] **Define new request types** in `types.ts`
- [ ] **Add detection logic** in background service worker
- [ ] **Create parsing functions** for new request formats
- [ ] **Extend traffic grouping** for new data types
- [ ] **Design UI components** for new traffic display
- [ ] **Update state management** for new data
- [ ] **Add tests** for new functionality
- [ ] **Update documentation** and notes

## 🔍 Current Development Status

- **✅ Core architecture** - Complete and stable
- **✅ Traffic detection** - Working via Chrome debugger
- **✅ UI framework** - Card-based design implemented
- **🚨 Sorting issue** - Known bug (oldest to newest)
- **🔧 Timestamp fixes** - Recently implemented, needs testing
- **📝 Documentation** - Comprehensive notes and structure

---

*This structure provides a solid foundation for integrating additional services while maintaining the existing architecture and patterns.*
