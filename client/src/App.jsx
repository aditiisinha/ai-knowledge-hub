import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useEffect, useState } from 'react';
import Register from './pages/Register.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Navbar from './components/Navbar.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <Navbar isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route
              path="/"
              element={
                isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
              }
            />
            <Route
              path="/login"
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Login setIsAuthenticated={setIsAuthenticated} />
                )
              }
            />
            <Route
              path="/register"
              element={
                isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />
              }
            />
            <Route element={<ProtectedRoute />}>
              <Route 
                path="/dashboard" 
                element={
                  <Dashboard setIsAuthenticated={setIsAuthenticated} />
                } 
              />
            </Route>
            <Route
              path="*"
              element={
                <div className="min-h-screen flex flex-col items-center justify-center text-center">
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
                  <p className="text-gray-600 mb-6">Page not found</p>
                  <button
                    onClick={() => window.location.href = "/"}
                    className="px-4 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Go Home
                  </button>
                </div>
              }
            />
          </Routes>
          <ToastContainer position="top-right" autoClose={5000} />
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
