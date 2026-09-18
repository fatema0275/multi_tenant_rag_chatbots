import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { GoogleOAuthProvider } from '@react-oauth/google';
import store from './store';
import App from './App.jsx';
import Toast from './components/ui/Toast';
import './index.css';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
if (import.meta.env.DEV) {
  console.info('[SiteMind Auth] Active VITE_GOOGLE_CLIENT_ID:', googleClientId ? `${googleClientId.slice(0, 16)}...` : '(not configured)');
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[React ErrorBoundary caught error]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-red-500 bg-black min-h-screen font-mono">
          <h1 className="text-xl font-bold mb-4">Application Error</h1>
          <pre className="whitespace-pre-wrap bg-zinc-900 p-4 rounded text-sm text-red-400">
            {String(this.state.error?.stack || this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <Provider store={store}>
      {googleClientId ? (
        <GoogleOAuthProvider clientId={googleClientId}>
          <App />
          <Toast />
        </GoogleOAuthProvider>
      ) : (
        <>
          <App />
          <Toast />
        </>
      )}
    </Provider>
  </ErrorBoundary>
);

