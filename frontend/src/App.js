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

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Algo salió mal</h1>
            <p className="text-gray-700 mb-4">Ha ocurrido un error en la aplicación.</p>
            <details className="bg-gray-100 p-4 rounded text-sm">
              <summary className="cursor-pointer font-medium">Detalles del error</summary>
              <pre className="mt-2 whitespace-pre-wrap overflow-auto">
                {this.state.error && this.state.error.toString()}
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </details>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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

function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

export default AppWithErrorBoundary;