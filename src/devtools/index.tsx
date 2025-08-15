import React from 'react'
import { createRoot } from 'react-dom/client'
import { DevToolsPanel } from './pages/devtools-panel'
import './index.css'

// Create DevTools panel
chrome.devtools.panels.create(
  'Algolia Validator',
  null,
  'src/devtools/index.html',
  (panel) => {
    // Panel created
  }
)

// Render the DevTools panel
const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<DevToolsPanel />)
}
