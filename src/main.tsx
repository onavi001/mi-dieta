import { createRoot } from 'react-dom/client'
import './index.css'
import { initSentry } from '@/initSentry'
import App from '@/app/App'

initSentry()

createRoot(document.getElementById('root')!).render(
  <App />,
)