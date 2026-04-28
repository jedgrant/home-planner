import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Providers } from '@/app/Providers'
import { AppErrorBoundary } from '@/app/AppErrorBoundary'
import { router } from '@/app/router'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </AppErrorBoundary>
  </StrictMode>,
)
