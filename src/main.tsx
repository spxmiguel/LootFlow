import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Show errors visually if React fails to mount
window.addEventListener('error', (e) => {
  const root = document.getElementById('root')
  if (root && !root.hasChildNodes()) {
    root.innerHTML = `<div style="padding:40px;color:#f87171;font-family:monospace;font-size:13px;max-width:600px">
      <h2 style="color:white;margin-bottom:12px">LootFlow — Erro</h2>
      <pre style="white-space:pre-wrap">${e.message}</pre>
      <button onclick="location.reload()" style="margin-top:20px;padding:8px 16px;background:#38bdf8;color:black;border:none;border-radius:8px;cursor:pointer">
        Recarregar
      </button>
    </div>`
  }
})

try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
} catch (e) {
  document.getElementById('root')!.innerHTML = `<div style="padding:40px;color:#f87171;font-family:monospace">
    <h2 style="color:white">Erro fatal</h2><pre>${e}</pre>
  </div>`
}
