import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';

/**
 * App — root component.
 * All routing is delegated to AppRoutes for cleanliness.
 * Provider wrapping (Redux, Toaster) is done in main.jsx.
 */
function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppRoutes />
    </Router>
  );
}

export default App;
