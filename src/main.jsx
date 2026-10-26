import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import HeroHeader from './HeroHeader.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HeroHeader />
  </StrictMode>,
)
