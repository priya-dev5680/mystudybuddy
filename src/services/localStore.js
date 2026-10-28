/** Small persistence adapter; replace with API calls without changing page components. */
export function loadValue(key, fallback) {
  try {
    const value = localStorage.getItem(`study-club:${key}`);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function saveValue(key, value) {
  try { localStorage.setItem(`study-club:${key}`, JSON.stringify(value)); } catch { /* storage may be unavailable */ }
}

export function removeValue(key) {
  try { localStorage.removeItem(`study-club:${key}`); } catch { /* storage may be unavailable */ }
}
