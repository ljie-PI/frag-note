import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App.tsx';
import { LocaleProvider } from './i18n/LocaleContext.tsx';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root was not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <LocaleProvider>
      <App />
    </LocaleProvider>
  </React.StrictMode>,
);
