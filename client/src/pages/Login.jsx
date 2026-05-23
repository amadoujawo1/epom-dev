import React, { useState, useEffect, useRef } from 'react'
import './Login.css'
import { useLanguage } from '../context/LanguageContext'

export default function Login({ onLogin }) {
  const { t, lang, setLang } = useLanguage()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isShake, setIsShake] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark')
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaUserId, setMfaUserId] = useState(null)
  const [mfaMessage, setMfaMessage] = useState('')
  const [mfaCode, setMfaCode] = useState(['', '', '', '', '', ''])

  const mfaRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)]

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const triggerShake = () => {
    setIsShake(true)
    setTimeout(() => setIsShake(false), 500)
  }

  const submitLogin = (e) => {
    e.preventDefault()
    if (!username || !password) {
      setError(t('login_err_fields'))
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
        if (!res.ok) throw new Error(data.error || 'Authentication failed.')
        return data
      })
      .then((data) => {
        if (data.mfa_required) {
          setMfaRequired(true)
          setMfaUserId(data.user_id)
          setMfaMessage(data.message)
          setLoading(false)
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

  const submitMfa = (e) => {
    e.preventDefault()
    const codeString = mfaCode.join('')
    if (codeString.length < 6) {
      setError(t('login_err_mfa'))
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
        if (!res.ok) throw new Error(data.error || 'Invalid code.')
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

  const fillDemoCredentials = (role) => {
    setError('')
    if (role === 'admin') { setUsername('admin'); setPassword('admin123') }
  }

  const handleMfaChange = (value, index) => {
    if (value && !/^\d$/.test(value)) return
    const newCode = [...mfaCode]
    newCode[index] = value
    setMfaCode(newCode)
    if (value && index < 5) mfaRefs[index + 1].current?.focus()
  }

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

  const handleMfaPaste = (e) => {
    e.preventDefault()
    const pasteData = e.clipboardData.getData('text').trim()
    if (/^\d{6}$/.test(pasteData)) {
      setMfaCode(pasteData.split(''))
      mfaRefs[5].current?.focus()
    }
  }

  const cancelMfa = () => {
    setMfaRequired(false)
    setMfaUserId(null)
    setMfaMessage('')
    setMfaCode(['', '', '', '', '', ''])
    setError('')
  }

  return (
    <div className="login-wrapper">
      <div className="login-bg-decorations">
        <div className="login-orb login-orb-1"></div>
        <div className="login-orb login-orb-2"></div>
        <div className="login-orb login-orb-3"></div>
      </div>

      {/* Top-right controls: lang toggle + theme toggle */}
      <div className="login-top-controls">
        <button
          className="login-lang-toggle"
          onClick={() => setLang(lang === 'en' ? 'fr' : 'en')}
          type="button"
          title={t('toggle_language')}
        >
          <span className={lang === 'en' ? 'lang-active' : ''}>EN</span>
          <span className="lang-divider">|</span>
          <span className={lang === 'fr' ? 'lang-active' : ''}>FR</span>
        </button>
        <button
          className="login-theme-toggle"
          onClick={() => setIsDark(prev => !prev)}
          title={t('toggle_theme')}
          type="button"
        >
          {isDark ? '☀️' : '🌙'}
        </button>
      </div>

      {/* Left panel */}
      <div className="login-panel-left">
        <div className="login-brand-header">
          <div className="login-brand-logo">
            <img src="https://upload.wikimedia.org/wikipedia/commons/8/86/Africa_%28orthographic_projection%29.svg" alt="ePOM logo" />
          </div>
          <span>ePOM</span>
        </div>

        <div className="login-hero-content">
          <span className="login-badge">{t('login_badge')}</span>
          <h1 className="login-hero-title">
            {t('login_hero_title_1')} <span>{t('login_hero_title_2')}</span>
          </h1>
          <p className="login-hero-desc">{t('login_hero_desc')}</p>

          <div className="login-stats-grid">
            <div className="login-stat-card">
              <div className="login-stat-num">{lang === 'fr' ? 'ACTIF' : 'ACTIVE'}</div>
              <div className="login-stat-label">{t('login_stat_node')}</div>
            </div>
            <div className="login-stat-card">
              <div className="login-stat-num">AES-256</div>
              <div className="login-stat-label">{t('login_stat_enc')}</div>
            </div>
          </div>
        </div>

        <div className="login-brand-footer">
          © {new Date().getFullYear()} {t('login_footer')}
        </div>
      </div>

      {/* Right panel */}
      <div className="login-panel-right">
        <div className={`login-card ${isShake ? 'login-alert-shake' : ''}`}>

          <div className="login-card-logo-mob">
            <div className="login-brand-logo">
              <img src="https://upload.wikimedia.org/wikipedia/commons/8/86/Africa_%28orthographic_projection%29.svg" alt="ePOM logo" />
            </div>
          </div>

          <div className="login-card-header">
            <h2 className="login-card-title">
              {mfaRequired ? t('login_mfa_title') : t('login_welcome')}
            </h2>
            <p className="login-card-subtitle">
              {mfaRequired ? t('login_mfa_sub') : t('login_welcome_sub')}
            </p>
          </div>

          {error && (
            <div className="login-alert login-alert-error">
              <span className="login-alert-icon">⚠️</span>
              <div>{error}</div>
            </div>
          )}

          {mfaRequired && mfaMessage && !error && (
            <div className="login-alert login-alert-info">
              <span className="login-alert-icon">📱</span>
              <div>{mfaMessage}</div>
            </div>
          )}

          {!mfaRequired ? (
            <form onSubmit={submitLogin} className="login-form">
              <div className="login-input-group">
                <label className="login-label">{t('login_username')}</label>
                <div className="login-input-container">
                  <span className="login-input-icon">👤</span>
                  <input
                    type="text"
                    className="login-input"
                    placeholder={t('login_username_placeholder')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="login-input-group">
                <label className="login-label">{t('login_password')}</label>
                <div className="login-input-container">
                  <span className="login-input-icon">🔒</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="login-input"
                    placeholder={t('login_password_placeholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    className="login-input-eye"
                    onClick={() => setShowPassword(prev => !prev)}
                  >
                    {showPassword ? '👁️' : '🙈'}
                  </button>
                </div>
              </div>

              <button type="submit" className="login-btn-primary" disabled={loading}>
                {loading ? (
                  <><div className="login-spinner"></div>{t('login_authenticating')}</>
                ) : t('login_authorize')}
              </button>

              <div className="login-demo-section">
                <div className="login-demo-title">{t('login_demo_title')}</div>
                <div className="login-demo-chips">
                  <button
                    type="button"
                    className="login-demo-chip"
                    onClick={() => fillDemoCredentials('admin')}
                    disabled={loading}
                  >
                    {t('login_demo_admin')}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={submitMfa} className="login-form">
              <div className="login-input-group">
                <label className="login-label" style={{ textAlign: 'center', marginBottom: '8px' }}>
                  {t('login_verify_code')}
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
                      onKeyDown={(e) => handleMfaKeyDown(e, idx)}
                      disabled={loading}
                      required
                    />
                  ))}
                </div>
              </div>

              <button type="submit" className="login-btn-primary" disabled={loading}>
                {loading ? (
                  <><div className="login-spinner"></div>{t('login_verifying')}</>
                ) : t('login_verify_btn')}
              </button>

              <button
                type="button"
                className="btn-outline"
                style={{ width: '100%', padding: '12px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--login-card-border)', background: 'transparent', color: 'var(--login-text)', transition: 'all 0.3s ease' }}
                onClick={cancelMfa}
                disabled={loading}
              >
                {t('login_return')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
