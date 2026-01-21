import React from 'react';
import ReactDOM from 'react-dom/client';
import 'reflect-metadata';

import '@/app/styles/global.css';
import { ErrorBoundary } from '@/shared/ErrorBoundary';

import { App } from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
