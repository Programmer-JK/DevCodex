import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { applyTheme } from './app/theme';
import './pwa/install';
import './styles/app.css';

applyTheme();
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
