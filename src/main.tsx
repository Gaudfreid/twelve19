import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './app/App'
import { applyTheme, getTheme } from './lib/theme'
applyTheme(getTheme())
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme(getTheme()))
createRoot(document.getElementById('root')!).render(<StrictMode><HashRouter><App /></HashRouter></StrictMode>)
