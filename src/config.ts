// src/config.ts

// Detect if we are running under Capacitor / WebView
export const isCapacitor = typeof window !== "undefined" && (
  window.location.origin.startsWith("capacitor://") ||
  window.location.origin.startsWith("http://localhost") && !window.location.port ||
  window.location.hostname === "localhost" && !window.location.port
);

// The production backend base URL
export const BACKEND_URL = "https://ais-pre-4d2hzxztj6yiwl5lwiiebn-889443325100.europe-west2.run.app";

// Centralized API Base URL
export const API_BASE = isCapacitor 
  ? `${BACKEND_URL}/api`
  : `${window.location.origin}/api`;

// Centralized Socket/WebRTC signaling URL
export const SOCKET_URL = isCapacitor 
  ? BACKEND_URL 
  : window.location.origin;

console.log("[CallMe Config] Environment isCapacitor:", isCapacitor);
console.log("[CallMe Config] API_BASE URL:", API_BASE);
console.log("[CallMe Config] SOCKET_URL:", SOCKET_URL);

/**
 * Robust wrapper for fetch requests to handle and log failing requests
 * specifically to detect and diagnose any HTML content where JSON was expected.
 */
export async function safeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlString = typeof input === "string" 
    ? input 
    : (input instanceof URL ? input.toString() : input.url);

  // Set Authorization Header if user email is stored locally
  const email = typeof window !== "undefined" 
    ? (localStorage.getItem('callme_logged_email') || localStorage.getItem('hoo_logged_email'))
    : null;

  let requestInit = init || {};
  if (email) {
    const headers = new Headers(requestInit.headers || {});
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${email}`);
      requestInit = { ...requestInit, headers };
    }
  }

  try {
    const response = await fetch(input, requestInit);
    
    // Check if the request failed or if the content type is HTML when expecting JSON
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || contentType.includes("text/html")) {
      const text = await response.clone().text();
      console.warn(`[CallMe Request Failed]
        URL: ${urlString}
        HTTP Status: ${response.status}
        Content-Type: ${contentType}
        Returned Body Preview: ${text.substring(0, 300)}...
      `);
    }
    return response;
  } catch (err: any) {
    console.error(`[CallMe Fetch Exception] URL: ${urlString}`, err);
    throw err;
  }
}

/**
 * Prepends SOCKET_URL to relative paths starting with /uploads
 * to ensure files load correctly under Capacitor / WebViews / Iframes.
 */
export function resolveMediaUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (
    url.startsWith("data:") || 
    url.startsWith("http://") || 
    url.startsWith("https://") || 
    url.startsWith("blob:")
  ) {
    return url;
  }
  if (url.startsWith("/uploads")) {
    const baseUrl = SOCKET_URL;
    const cleanBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    return `${cleanBase}${url}`;
  }
  return url;
}
