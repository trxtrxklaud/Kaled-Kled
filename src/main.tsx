import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { Toaster } from 'sonner'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DataProvider>
      <LanguageProvider>
        <AuthProvider>
          <App />
          <Toaster position="top-center" richColors closeButton />
        </AuthProvider>
      </LanguageProvider>
    </DataProvider>
  </React.StrictMode>,
)
