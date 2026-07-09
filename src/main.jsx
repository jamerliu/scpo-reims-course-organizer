import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LangProvider } from './i18n/LangContext';
import { AuthProvider } from './auth/AuthContext';
import AppRoot from './AppRoot.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LangProvider>
      <AuthProvider>
        <AppRoot />
      </AuthProvider>
    </LangProvider>
  </StrictMode>,
);
