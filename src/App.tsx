// src/App.tsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ModalProvider } from './context/ModalContext';
import { AdminModalProvider } from './context/AdminModalContext'; // <-- IMPORTA IL NUOVO CONTESTO
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
import { MenuManagementModal } from './components/Admin/MenuManagementModal'; // <-- IMPORTA IL MODALE ADMIN

function App() {
  const [adminRefreshKey, setAdminRefreshKey] = React.useState(0);

  return (
    <Router>
      <AuthProvider>
        <ModalProvider>
          <AdminModalProvider> {/* <-- AVVOLGI L'APP CON IL NUOVO PROVIDER */}
            <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/home" element={<ProtectedRoute><Layout><Home /></Layout></ProtectedRoute>} />
              <Route path="/calendar" element={<ProtectedRoute><Layout><UserDashboard /></Layout></ProtectedRoute>} />
              <Route path="/calendar/weekly" element={<ProtectedRoute><Layout><WeeklySummary /></Layout></ProtectedRoute>} />
              <Route path="/calendar/monthly" element={<ProtectedRoute><Layout><MonthlySummary /></Layout></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard key={adminRefreshKey} /></ProtectedRoute>} />
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
            
            <UnifiedMealSelectionModal />
            <MenuManagementModal onSave={() => setAdminRefreshKey(k => k + 1)} /> {/* <-- RENDERIZZA IL MODALE ADMIN QUI */}

          </AdminModalProvider>
        </ModalProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;