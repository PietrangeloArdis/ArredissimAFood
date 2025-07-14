import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ModalProvider } from './context/ModalContext';
import Login from './components/Login';
import Home from './components/Home';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/Admin/AdminDashboard';
import WeeklySummary from './components/User/WeeklySummary';
import MonthlySummary from './components/User/MonthlySummary';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/shared/Layout';
import UnifiedMealSelectionModal from './components/shared/UnifiedMealSelectionModal';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ModalProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route 
              path="/home" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Home />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/calendar" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <UserDashboard />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/calendar/weekly" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <WeeklySummary />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/calendar/monthly" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <MonthlySummary />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            {/* CRITICAL FIX: Set Home as default landing page */}
            <Route path="/" element={<Navigate to="/home\" replace />} />
            {/* Catch-all route for any unmatched paths */}
            <Route path="*" element={<Navigate to="/home\" replace />} />
          </Routes>
          
          {/* UNIFIED MODAL - Rendered at app root level */}
          <UnifiedMealSelectionModal />
        </ModalProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;