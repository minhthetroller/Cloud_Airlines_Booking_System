// Small fetch wrapper for the app's own API routes

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data: any = null,
  ) {
    super(message)
  }
}

async function request<T>(method: string, url: string, body?: unknown, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...init,
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(response.status, data?.error || `Request failed (${response.status})`, data)
  }
  return data as T
}

export const api = {
  get: <T = any>(url: string) => request<T>("GET", url),
  post: <T = any>(url: string, body?: unknown) => request<T>("POST", url, body ?? {}),
  put: <T = any>(url: string, body?: unknown, init?: RequestInit) => request<T>("PUT", url, body ?? {}, init),
  patch: <T = any>(url: string, body?: unknown) => request<T>("PATCH", url, body ?? {}),
  delete: <T = any>(url: string, body?: unknown) => request<T>("DELETE", url, body),
}
