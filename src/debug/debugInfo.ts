export type DebugApiFailure = {
  url: string;
  method: string;
  status?: number;
  responseText?: string;
  error?: string;
  at: string;
};

export type DebugAuthEvent = {
  step: string;
  message?: string;
  at: string;
};

const debugStorageKey = "tmm-debug-mode";
const maxResponseLength = 1200;
const listeners = new Set<() => void>();
let lastApiFailure: DebugApiFailure | null = null;
let lastAuthEvent: DebugAuthEvent | null = null;
let lastProfileLoadError: string | null = null;

export function isDebugEnabled() {
  const query = new URLSearchParams(window.location.search);
  const debugParam = query.get("debug");

  if (debugParam === "1") {
    safeSetLocalStorage(debugStorageKey, "1");
    return true;
  }

  if (debugParam === "0") {
    safeRemoveLocalStorage(debugStorageKey);
    return false;
  }

  return safeGetLocalStorage(debugStorageKey) === "1";
}

export function subscribeDebugInfo(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function recordApiFailure(failure: Omit<DebugApiFailure, "at">) {
  lastApiFailure = {
    ...failure,
    responseText: truncate(failure.responseText),
    error: truncate(failure.error),
    at: new Date().toISOString(),
  };
  notify();
}

export function recordAuthEvent(step: string, message?: string) {
  lastAuthEvent = {
    step,
    message: truncate(message),
    at: new Date().toISOString(),
  };
  notify();
}

export function recordProfileLoadError(message: string) {
  lastProfileLoadError = truncate(message) ?? null;
  notify();
}

export function getDebugSnapshot(auth?: {
  status: string;
  userEmail?: string | null;
  displayName?: string | null;
}) {
  return {
    buildTime: import.meta.env.VITE_BUILD_TIME || null,
    url: window.location.href,
    userAgent: navigator.userAgent,
    browser: detectBrowser(),
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "https://localhost:7173/api",
    localStorageAvailable: storageAvailable("localStorage"),
    sessionStorageAvailable: storageAvailable("sessionStorage"),
    authStatus: auth?.status ?? "unbekannt",
    currentUserEmail: auth?.userEmail ?? null,
    currentDisplayName: auth?.displayName ?? null,
    lastApiFailure,
    lastAuthEvent,
    lastProfileLoadError,
  };
}

export function clearLocalAppData() {
  window.localStorage.clear();
  window.sessionStorage.clear();
  notify();
}

function notify() {
  listeners.forEach((listener) => listener());
}

function truncate(value?: string) {
  if (!value) return value;
  return value.length > maxResponseLength ? `${value.slice(0, maxResponseLength)}...` : value;
}

function storageAvailable(name: "localStorage" | "sessionStorage") {
  try {
    const storage = window[name];
    const key = "__tmm_debug_test__";
    storage.setItem(key, "1");
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function safeGetLocalStorage(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetLocalStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Debug-Modus darf die App nicht blockieren.
  }
}

function safeRemoveLocalStorage(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Debug-Modus darf die App nicht blockieren.
  }
}

function detectBrowser() {
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const platform = isIos ? "iOS" : /Android/.test(ua) ? "Android" : "Desktop";
  const inApp = /FBAN|FBAV|Instagram|Line|WhatsApp|wv/.test(ua);
  const browser = /CriOS|Chrome/.test(ua)
    ? "Chrome"
    : /Safari/.test(ua)
      ? "Safari"
      : /Firefox/.test(ua)
        ? "Firefox"
        : "Unbekannt";

  return {
    platform,
    browser,
    inAppBrowser: inApp,
  };
}
