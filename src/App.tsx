import './index.css'

import {StudioAppProvider} from '@manifoldxyz/studio-app-sdk-react'
import {BrowserRouter, Route, Routes} from 'react-router-dom'
import {HomePage } from 'src/pages/HomePage'
import {NotFoundPage} from 'src/pages/NotFoundPage'
import {SoulboundTokensPage} from 'src/pages/SoulboundTokensPage'
import { NewTokenPage } from './pages/NewTokenPage'

export function App() {
  return (
    // The StudioAppProvider component allows us to use all the SDK hooks out of the box within our app.
    // Don't forget to wrap it around your app when wanting to use the SDK!
    <StudioAppProvider>
      <BrowserRouter>
        <Routes>
          <Route index element={<HomePage />} />
          <Route path="*" element={<NotFoundPage />} />
          <Route path="contract/:id" element={<SoulboundTokensPage />} />
          <Route path="contract/:id/collection/:collection" element={<NewTokenPage />} />
        </Routes>
      </BrowserRouter>
    </StudioAppProvider>
  )
}