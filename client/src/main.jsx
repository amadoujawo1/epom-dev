import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { LanguageProvider } from './context/LanguageContext'

createRoot(document.getElementById('root')).render(
  <LanguageProvider>
    <App />
  </LanguageProvider>
)
