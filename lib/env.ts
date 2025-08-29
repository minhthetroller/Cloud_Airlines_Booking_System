// Environment variables utility

// Get the app URL with fallback
export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "https://www.cloud-airlines.space/"
}

// Get the API URL (for server-side requests)
export function getApiUrl(): string {
  const appUrl = getAppUrl()
  return `${appUrl.replace(/\/$/, "")}/api`
}

// Format a URL path with the app URL
export function formatAppUrl(path: string): string {
  const appUrl = getAppUrl()
  const baseUrl = appUrl.replace(/\/$/, "")
  const formattedPath = path.startsWith("/") ? path : `/${path}`
  return `${baseUrl}${formattedPath}`
}
