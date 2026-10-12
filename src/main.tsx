import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';
const Admin = React.lazy(() => import('./admin/Admin'));
const adminRoute = window.location.pathname.replace(/\/$/, '') === '/admin';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode>{adminRoute ? <React.Suspense fallback={<p role="status">Carregando painel...</p>}><Admin/></React.Suspense> : <App />}</React.StrictMode>);
