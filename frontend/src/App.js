import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';
import { ProtectedRoute } from './components/PermissionGuard';
import { PERMISSIONS } from './hooks/usePermissions';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Miembros from './pages/Miembros';
import MiembroForm from './pages/MiembroForm';
import MiembroDetalle from './pages/MiembroDetalle';
import Grupos from './pages/Grupos';
import Admin from './pages/Admin';
import POS from './pages/POS';
import POSVentasPage from './pages/POSVentasPage';
import './App.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            
            {/* Dashboard - Accesible para todos los usuarios autenticados */}
            <Route 
              path="dashboard" 
              element={
                <ProtectedRoute permission={PERMISSIONS.VIEW_DASHBOARD}>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Miembros - Solo admin, pastor, secretaria */}
            <Route 
              path="miembros" 
              element={
                <ProtectedRoute section="miembros" redirectTo="/dashboard">
                  <Miembros />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="miembros/nuevo" 
              element={
                <ProtectedRoute permission={PERMISSIONS.CREATE_MIEMBROS} redirectTo="/miembros">
                  <MiembroForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="miembros/:id" 
              element={
                <ProtectedRoute permission={PERMISSIONS.VIEW_MIEMBROS} redirectTo="/dashboard">
                  <MiembroDetalle />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="miembros/:id/editar" 
              element={
                <ProtectedRoute permission={PERMISSIONS.EDIT_MIEMBROS} redirectTo="/miembros">
                  <MiembroForm />
                </ProtectedRoute>
              } 
            />
            
            {/* Grupos - Solo admin, pastor, secretaria */}
            <Route 
              path="grupos" 
              element={
                <ProtectedRoute section="grupos" redirectTo="/dashboard">
                  <Grupos />
                </ProtectedRoute>
              } 
            />
            
            {/* Admin - Solo admin y TI */}
            <Route 
              path="admin" 
              element={
                <ProtectedRoute section="admin" redirectTo="/dashboard">
                  <Admin />
                </ProtectedRoute>
              } 
            />
            
            {/* POS - Solo agente_restaurante, ayudante_restaurante, admin */}
            <Route 
              path="pos" 
              element={
                <ProtectedRoute section="pos" redirectTo="/dashboard">
                  <POS />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="pos/ventas" 
              element={
                <ProtectedRoute permission={PERMISSIONS.CREATE_SALES} redirectTo="/pos">
                  <POSVentasPage />
                </ProtectedRoute>
              } 
            />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}

export default App;