// API utility with automatic token handling
export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('token')
  const headers = {
    ...options.headers
  }
  
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  
  // Enhanced token check to avoid sending "null" or "undefined" as strings
  if (token && token !== 'null' && token !== 'undefined') {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  const response = await fetch(url, {
    ...options,
    headers
  })

  if (!response.ok) {
    // Try to extract server-provided error message
    let errMsg = `API error: ${response.status}`
    try {
      const body = await response.json()
      if (body) {
        if (body.error) errMsg = body.error
        else if (body.message) errMsg = body.message
      }
    } catch (e) {
      // ignore JSON parse errors
    }

    // If unauthorized, clear token and force reload to show login
    if (response.status === 401) {
      localStorage.removeItem('token')
      // reload app so Login screen appears
      window.location.reload()
      throw new Error('Unauthorized')
    }

    throw new Error(errMsg)
  }

  return response.json()
}
