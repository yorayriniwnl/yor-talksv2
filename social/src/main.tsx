import * as React from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';

import './index.css';
import './premium.css';
import './operator.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
