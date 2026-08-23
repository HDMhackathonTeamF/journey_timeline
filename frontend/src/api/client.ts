const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1').replace(/\/$/, '')
const TOKEN_STORAGE_PREFIX = 'journey-access-token:'

export function getJourneyAccessToken(journeyId: string): string | null {
  return window.sessionStorage.getItem(`${TOKEN_STORAGE_PREFIX}${journeyId}`)
}

export function setJourneyAccessToken(journeyId: string, token: string): void {
  window.sessionStorage.setItem(`${TOKEN_STORAGE_PREFIX}${journeyId}`, token)
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })
  if (!response.ok) {
    let message = `APIリクエストに失敗しました (${response.status})`
    try { const body = await response.json() as { detail?: string }; if (body.detail) message = body.detail } catch { /* response is not JSON */ }
    throw new ApiError(message, response.status)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
