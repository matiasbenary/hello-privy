import { Navigation } from './components/navigation'
import Home from './pages/home'

import HelloNear from './pages/hello_near'
import { BrowserRouter, HashRouter, Routes, Route } from 'react-router'

import { NearProvider } from './context/useNear'
import { NetworkId, HelloNearContract } from './config'

function App() {
  // Use HashRouter when deployed under a subpath (GitHub Pages)
  const useHashRouter = import.meta.env.BASE_URL !== '/'
  const Router = useHashRouter ? HashRouter : BrowserRouter

  return (
    <NearProvider
      network={NetworkId}
      contractId={HelloNearContract}
      allowedMethods={['get_greeting', 'set_greeting']}
    >
      <Router>
        <Navigation />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/hello-near" element={<HelloNear />} />
        </Routes>
      </Router>
    </NearProvider>
  )
}

export default App
