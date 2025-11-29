import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Result from './pages/Result';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import SettingsPage from './pages/SettingsPage';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import './App.css';

function AppContent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Hide sidebar on auth pages and settings page
  const hideSidebar = ['/login', '/register', '/forgot-password', '/reset-password', '/settings'].includes(location.pathname);

  return (
    <div className="app-container">
      {location.pathname === '/' && (
        <button
          onClick={toggleTheme}
          className="theme-toggle-btn"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      )}
      {!hideSidebar && <Sidebar isOpen={isSidebarOpen} toggle={toggleSidebar} />}
      <main className={`main-content ${isSidebarOpen && !hideSidebar ? 'sidebar-open' : ''}`}>
        <Routes>
          <Route path="/" element={<Home isSidebarOpen={isSidebarOpen} />} />
          <Route path="/result" element={<Result />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App;
