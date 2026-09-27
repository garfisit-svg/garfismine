import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import App from './App.tsx';
import { isSupabaseConfigured } from './lib/supabase';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Application root element was not found.');

const root = createRoot(rootElement);

if (import.meta.env.PROD && !isSupabaseConfigured) {
  root.render(
    <main role="alert" className="min-h-screen bg-[#030303] text-white flex items-center justify-center p-6">
      <section className="max-w-lg rounded-2xl border border-red-500/30 bg-[#12121A] p-8 text-center">
        <h1 className="text-2xl font-bold">GARF is temporarily unavailable</h1>
        <p className="mt-3 text-white/70">
          Production data services are not configured. Please contact the site administrator.
        </p>
      </section>
    </main>
  );
} else {
  root.render(
    <StrictMode>
      <BrowserRouter>
        <AppProvider>
          <App />
        </AppProvider>
      </BrowserRouter>
    </StrictMode>,
  );
}
