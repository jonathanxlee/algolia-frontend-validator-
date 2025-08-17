// Session envelope
export interface Session {
    sessionId: string;
    siteId: string;
    pageUrl: string;
    timeRange: [string, string]; // ISO datetimes [start, end]
    contractVersion?: string;
    networkRequests: NetworkRequest[];
  }
  
  // Discriminated union of request envelopes
  export type NetworkRequest = SearchRequest | InsightsRequest;
  
  // Common wire-level fields for any captured HTTP request
  export interface BaseRequest {
    ts: string; // ISO datetime when the HTTP request was observed
    type: "search_request" | "insights_request";
    url: string;
    method: "GET" | "POST";
    appId?: string;
  
    requestHeaders: Record<string, string>;
    requestBody: string; // raw body ("" for GET)
    responseStatus: number; // 100..599
    responseHeaders: Record<string, string>;
    responseBody: string; // raw JSON/string
  }
  
  /** 1) SearchRequest — single HTTP call that may carry one or many logical queries */
  export interface SearchRequest extends BaseRequest {
    type: "search_request";
    queries: SearchQuery[];
  }
  
  /** One logical query carried inside a SearchRequest */
  export interface SearchQuery {
    id: string;            // per-query unique id (e.g., `${requestId}:${subId}` or any UUID)
    subId?: number;        // 0-based position inside a multi-query
    time?: string;         // optional per-query ts (defaults to parent request ts)
  
    index: string;         // Algolia index name
    params: string;        // raw "params" string from Algolia SDK
    paramsParsed?: {
      query?: string;
      userToken?: string;
      hitsPerPage?: number;
      filters?: string;
      facets?: string[];
      clickAnalytics?: boolean;
      distinct?: number | boolean;
      attributeForDistinct?: string;
      sortBy?: string;
      [k: string]: unknown;
    };
  
    // Often derived from params/response; kept for UI convenience
    queryID?: string;      // Algolia-generated (present when clickAnalytics=true)
    userToken?: string;
    clickAnalytics?: boolean;
  }
  
  /** 2) InsightsRequest — single HTTP call that may carry one or many insights events */
  export interface InsightsRequest extends BaseRequest {
    type: "insights_request";
    events: InsightsEvent[];
  }
  
  /** One insights event carried inside an InsightsRequest */
  export interface InsightsEvent {
    id: string;                        // per-event unique id (within session)
    eventTs?: string;                  // optional per-event ts (defaults to parent ts)
  
    eventType: "click" | "conversion" | "view";
    eventName: string;
    index: string;
  
    objectIDs: string[];
    positions?: number[];              // required by Algolia when eventType="click"
    queryID?: string;
    userToken?: string;
  }
  