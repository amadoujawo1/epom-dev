import React, { useState, useEffect, useRef } from 'react'
import './Login.css'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isShake, setIsShake] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Theme state
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark')

  // MFA states
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaUserId, setMfaUserId] = useState(null)
  const [mfaMessage, setMfaMessage] = useState('')
  const [mfaCode, setMfaCode] = useState(['', '', '', '', '', ''])
  
  const mfaRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null)
  ]

  // Sync theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  // Trigger error shake animation
  const triggerShake = () => {
    setIsShake(true)
    setTimeout(() => setIsShake(false), 500)
  }

  // Handle standard login submission
  const submitLogin = (e) => {
    e.preventDefault()
    if (!username || !password) {
      setError('Please enter both username and password')
      triggerShake()
      return
    }
    
    setLoading(true)
    setError('')

    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Authentication failed. Please verify credentials.')
        }
        return data
      })
      .then((data) => {
        if (data.mfa_required) {
          setMfaRequired(true)
          setMfaUserId(data.user_id)
          setMfaMessage(data.message)
          setLoading(false)
          // Autofocus first digit
          setTimeout(() => mfaRefs[0].current?.focus(), 100)
        } else {
          localStorage.setItem('token', data.token)
          if (data.user) localStorage.setItem('user', JSON.stringify(data.user))
          onLogin()
        }
      })
      .catch((err) => {
        setError(err.message)
        triggerShake()
        setLoading(false)
      })
  }

  // Handle MFA verify submission
  const submitMfa = (e) => {
    e.preventDefault()
    const codeString = mfaCode.join('')
    if (codeString.length < 6) {
      setError('Please fill in all 6 verification digits')
      triggerShake()
      return
    }

    setLoading(true)
    setError('')

    fetch('/api/auth/mfa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: mfaUserId, code: codeString })
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Invalid code. Authentication denied.')
        }
        return data
      })
      .then((data) => {
        localStorage.setItem('token', data.token)
        if (data.user) localStorage.setItem('user', JSON.stringify(data.user))
        onLogin()
      })
      .catch((err) => {
        setError(err.message)
        triggerShake()
        setLoading(false)
      })
  }

  // Quick fill demo user credentials
  const fillDemoCredentials = (role) => {
    setError('')
    if (role === 'admin') {
      setUsername('admin')
      setPassword('admin123')
    }
  }

  // Handle MFA text input logic
  const handleMfaChange = (value, index) => {
    // Only accept numeric inputs
    if (value && !/^\d$/.test(value)) return

    const newCode = [...mfaCode]
    newCode[index] = value
    setMfaCode(newCode)

    if (value && index < 5) {
      mfaRefs[index + 1].current?.focus()
    }
  }

  // Handle MFA backspace
  const handleMfaKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!mfaCode[index] && index > 0) {
        const newCode = [...mfaCode]
        newCode[index - 1] = ''
        setMfaCode(newCode)
        mfaRefs[index - 1].current?.focus()
      } else {
        const newCode = [...mfaCode]
        newCode[index] = ''
        setMfaCode(newCode)
      }
    }
  }

  // Handle MFA paste clipboard
  const handleMfaPaste = (e) => {
    e.preventDefault()
    const pasteData = e.clipboardData.getData('text').trim()
    if (/^\d{6}$/.test(pasteData)) {
      const newCode = pasteData.split('')
      setMfaCode(newCode)
      mfaRefs[5].current?.focus()
    }
  }

  // Cancel MFA and return to normal login
  const cancelMfa = () => {
    setMfaRequired(false)
    setMfaUserId(null)
    setMfaMessage('')
    setMfaCode(['', '', '', '', '', ''])
    setError('')
  }

  return (
    <div className="login-wrapper">
      {/* Background shapes */}
      <div className="login-bg-decorations">
        <div className="login-orb login-orb-1"></div>
        <div className="login-orb login-orb-2"></div>
        <div className="login-orb login-orb-3"></div>
      </div>

      {/* Light / Dark Mode Toggle button */}
      <button 
        className="login-theme-toggle" 
        onClick={() => setIsDark(prev => !prev)}
        title="Toggle Theme"
        aria-label="Toggle light or dark theme"
        type="button"
      >
        {isDark ? '☀️' : '🌙'}
      </button>

      {/* Left panel - Visual & Stats (Desktop Only) */}
      <div className="login-panel-left">
        <div className="login-brand-header">
          <div className="login-brand-logo">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/8/86/Africa_%28orthographic_projection%29.svg" 
              alt="ePOM logo" 
            />
          </div>
          <span>ePOM</span>
        </div>

        <div className="login-hero-content">
          <span className="login-badge">Tactical Node v2.2</span>
          <h1 className="login-hero-title">
            Strategic Platform for <span>Operations & Management</span>
          </h1>
          <p className="login-hero-desc">
            Secure, end-to-end administration of tactical assets, real-time directive dispatches, and personnel status operations.
          </p>

          <div className="login-stats-grid">
            <div className="login-stat-card">
              <div className="login-stat-num">ACTIVE</div>
              <div className="login-stat-label">System Node Status</div>
            </div>
            <div className="login-stat-card">
              <div className="login-stat-num">AES-256</div>
              <div className="login-stat-label">Encryption Protocol</div>
            </div>
          </div>
        </div>

        <div className="login-brand-footer">
          © {new Date().getFullYear()} ePOM Tactical. Authorized Personnel Only.
        </div>
      </div>

      {/* Right panel - The Login Form Card */}
      <div className="login-panel-right">
        <div className={`login-card ${isShake ? 'login-alert-shake' : ''}`}>
          
          {/* Brand Header for Mobile View */}
          <div className="login-card-logo-mob">
            <div className="login-brand-logo">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/8/86/Africa_%28orthographic_projection%29.svg" 
                alt="ePOM logo" 
              />
            </div>
          </div>

          <div className="login-card-header">
            <h2 className="login-card-title">
              {mfaRequired ? 'Security Verification' : 'Welcome Back'}
            </h2>
            <p className="login-card-subtitle">
              {mfaRequired 
                ? 'Enter the authorization code sent to your device'
                : 'Access the tactical administrative network'
              }
            </p>
          </div>

          {/* Error notifications */}
          {error && (
            <div className="login-alert login-alert-error">
              <span className="login-alert-icon">⚠️</span>
              <div>{error}</div>
            </div>
          )}

          {/* MFA Informational message */}
          {mfaRequired && mfaMessage && !error && (
            <div className="login-alert login-alert-info">
              <span className="login-alert-icon">📱</span>
              <div>{mfaMessage}</div>
            </div>
          )}

          {!mfaRequired ? (
            /* STANDARD CREDENTIALS LOGIN */
            <form onSubmit={submitLogin} className="login-form">
              <div className="login-input-group">
                <label className="login-label">Username</label>
                <div className="login-input-container">
                  <span className="login-input-icon">👤</span>
                  <input
                    type="text"
                    className="login-input"
                    placeholder="Enter tactical identity"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="login-input-group">
                <label className="login-label">Password</label>
                <div className="login-input-container">
                  <span className="login-input-icon">🔒</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="login-input"
                    placeholder="Enter security key"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    className="login-input-eye"
                    onClick={() => setShowPassword(prev => !prev)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '👁️' : '🙈'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="login-btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="login-spinner"></div>
                    Authenticating...
                  </>
                ) : (
                  'Authorize Access'
                )}
              </button>

              {/* Demo Helper Quick Fill Chips */}
              <div className="login-demo-section">
                <div className="login-demo-title">Quick Developer Sandbox</div>
                <div className="login-demo-chips">
                  <button
                    type="button"
                    className="login-demo-chip"
                    onClick={() => fillDemoCredentials('admin')}
                    disabled={loading}
                  >
                    ⚡ Use Demo Admin
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* MFA CHALLENGE SYSTEM */
            <form onSubmit={submitMfa} className="login-form">
              <div className="login-input-group">
                <label className="login-label" style={{ textAlign: 'center', marginBottom: '8px' }}>
                  Verification Code
                </label>
                <div className="login-mfa-container" onPaste={handleMfaPaste}>
                  {mfaCode.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={mfaRefs[idx]}
                      type="text"
                      className="login-mfa-input"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleMfaChange(e.target.value, idx)}
                      onKeyDown={(e) => handleMfaKeyDown(e.key, idx)}
                      disabled={loading}
                      required
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="login-btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="login-spinner"></div>
                    Verifying...
                  </>
                ) : (
                  'Verify Identity'
                )}
              </button>

              <button
                type="button"
                className="btn-outline"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid var(--login-card-border)',
                  background: 'transparent',
                  color: 'var(--login-text)',
                  transition: 'all 0.3s ease'
                }}
                onClick={cancelMfa}
                disabled={loading}
              >
                Return to Login
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}
