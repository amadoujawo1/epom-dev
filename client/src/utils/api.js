// API utility with automatic token handling
export async function apiFetch(url, options = {}) {
  let token = localStorage.getItem('token')
  const headers = {
    ...options.headers
  }
  
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  
  // Enhanced token check and sanitization
  if (token) {
    token = token.trim()
    if (token !== 'null' && token !== 'undefined' && token !== '') {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  const response = await fetch(url, {
    ...options,
    headers
  })

  if (!response.ok) {
    // Try to extract server-provided error message
    let errMsg = `API error: ${response.status}`
    let body = null
    try {
      body = await response.json()
      if (body) {
        if (body.error) errMsg = body.error
        else if (body.message) errMsg = body.message
      }
    } catch (e) {
      // ignore JSON parse errors
    }

    // If unauthorized (401) OR invalid token (422), clear session and force login
    if (response.status === 401 || (response.status === 422 && body?.error === 'Invalid Token')) {
      console.warn('Session invalid or expired. Clearing token...')
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      // reload app so Login screen appears
      window.location.reload()
      throw new Error('Session invalid')
    }

    throw new Error(errMsg)
  }

  return response.json()
}
