import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initSimulator } from './core/sim'
import './index.css'

const root = document.getElementById('root')!

try {
  await initSimulator()
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (e) {
  // Без WebAssembly-ядра нічого не працює; кажемо про це замість порожньої сторінки.
  root.textContent = `Failed to load the simulator core: ${e instanceof Error ? e.message : String(e)}`
  root.style.cssText = 'padding:2rem;font-family:system-ui;color:#b91c1c'
  throw e
}
