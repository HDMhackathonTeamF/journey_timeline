import { useEffect, useState } from 'react'
import { HomePage } from './pages/HomePage/HomePage'
import { JourneyPage } from './pages/JourneyPage/JourneyPage'
import { TermsPage } from './pages/TermsPage/TermsPage'
import { navigate } from './app/navigation'

function App() {
  const [location, setLocation] = useState(() => window.location.pathname + window.location.search)

  useEffect(() => {
    const update = () => setLocation(window.location.pathname + window.location.search)
    window.addEventListener('popstate', update)
    return () => window.removeEventListener('popstate', update)
  }, [])

  const path = location.split('?')[0]
  if (path === '/') return <HomePage />
  if (path === '/terms') return <TermsPage />
  if (path === '/journeys/new') return <JourneyPage journeyId={null} />
  const match = path.match(/^\/journeys\/([^/]+)$/)
  if (match) return <JourneyPage journeyId={decodeURIComponent(match[1])} />

  return <main style={{ padding: 48 }}><h1>ページが見つかりません</h1><button type="button" onClick={() => navigate('/')}>ホームへ戻る</button></main>
}

export default App
