import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';
import { runHerDraftReset } from './experiences/herUniverse/draftReset';
const Admin = React.lazy(() => import('./admin/Admin'));
const adminRoute = window.location.pathname.replace(/\/$/, '') === '/admin';
// Same PWA id/scope for both galaxies; Home Screen launch keeps Carol's entry route.
if(window.location.pathname.replace(/\/$/,'')==='/universo-dela/visao')document.querySelector<HTMLLinkElement>('link[rel="manifest"]')?.setAttribute('href','/stellar-mail-carol.webmanifest');
if (!adminRoute) runHerDraftReset();
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode>{adminRoute ? <React.Suspense fallback={<p role="status">Carregando painel...</p>}><Admin/></React.Suspense> : <App />}</React.StrictMode>);
