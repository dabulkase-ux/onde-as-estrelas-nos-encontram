import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';
import { runHerDraftReset } from './experiences/herUniverse/draftReset';
const Admin = React.lazy(() => import('./admin/Admin'));
const adminRoute = window.location.pathname.replace(/\/$/, '') === '/admin';
if (!adminRoute) runHerDraftReset();
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode>{adminRoute ? <React.Suspense fallback={<p role="status">Carregando painel...</p>}><Admin/></React.Suspense> : <App />}</React.StrictMode>);
