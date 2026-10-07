export function useApi() {
  const base = useRuntimeConfig().public.apiBase
  const token = useState<string>('auth-token', () => '')

  async function request<T>(path: string, options: Record<string, unknown> = {}): Promise<T> {
    return $fetch<T>(`${base}${path}`, { ...options,
      headers: { Accept: 'application/json', ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}) },
    }) as Promise<T>
  }

  async function authenticate(mode: string, payload: Record<string, unknown>) {
    const result = await request<{ token: string }>(`/auth/${mode}`, { method: 'POST', body: payload })
    token.value = result.token
    sessionStorage.setItem('bright-steps-token', result.token)
  }

  function restoreToken() {
    token.value = sessionStorage.getItem('bright-steps-token') ?? ''
  }

  async function logout() {
    await request('/auth/logout', { method: 'POST' })
    token.value = ''
    sessionStorage.removeItem('bright-steps-token')
  }
  return { request, authenticate, restoreToken, logout, token }
}
