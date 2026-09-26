import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "@neoglito/web/index.css"
import App from "@neoglito/web/App"

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
