/**
 * Appends lab_id as a query parameter to API URLs.
 * Usage: labFetch(labId, "/api/inventory") or labFetch(labId, "/api/inventory", { method: "POST", ... })
 */
export function labApiUrl(labId: string | undefined, url: string): string {
  if (!labId) return url
  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}lab_id=${labId}`
}
