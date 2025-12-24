import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';
import { ProtectedRoute } from './components/PermissionGuard';
import { PERMISSIONS } from './hooks/usePermissions';
import './App.css';

// Componentes cargados inmediatamente (críticos)
import Layout from './components/Layout';
import Login from './pages/Login';
import MeseroLogin from './pages/MeseroLogin';
import RequireMeseroAuth from './components/RequireMeseroAuth';

// Lazy loading para páginas (code splitting)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Miembros = lazy(() => import('./pages/Miembros'));
const MiembroForm = lazy(() => import('./pages/MiembroForm'));
const MiembroDetalle = lazy(() => import('./pages/MiembroDetalle'));
const Grupos = lazy(() => import('./pages/Grupos'));
const GrupoForm = lazy(() => import('./pages/GrupoForm'));
const GrupoDetalle = lazy(() => import('./pages/GrupoDetalle'));
const Admin = lazy(() => import('./pages/Admin'));
const InvitePage = lazy(() => import('./pages/InvitePage'));

// Lazy loading para módulo POS completo
const POS = lazy(() => import('./pages/POS'));
const POSVentasPage = lazy(() => import('./pages/POSVentasPage'));
const POSProductos = lazy(() => import('./pages/POSProductos'));
const POSTurnos = lazy(() => import('./pages/POSTurnos'));
const POSCuentas = lazy(() => import('./pages/POSCuentas'));
const CuentaDetailPage = lazy(() => import('./pages/CuentaDetailPage'));
const POSReportes = lazy(() => import('./pages/POSReportes'));
const POSInventario = lazy(() => import('./pages/POSInventario'));
const ClientesTemporales = lazy(() => import('./pages/ClientesTemporales'));
const RequireActiveShift = lazy(() => import('./components/RequireActiveShift'));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="mt-4 text-gray-600">Cargando...</p>
    </div>
  </div>
);

// React Query client con configuración optimizada
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      cacheTime: 1000 * 60 * 10, // 10 minutos
      retry: 1,
      refetchOnWindowFocus: false, // Evitar refetch innecesarios
      refetchOnMount: 'always',
    },
  },
});

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(_error) {
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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/pos/mesero-login" element={<MeseroLogin />} />
                
                {/* Página de invitación - Pública */}
                <Route path="/invite/:token" element={<InvitePage />} />
                
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
            <Route 
              path="grupos/nuevo" 
              element={
                <ProtectedRoute permission={PERMISSIONS.CREATE_GRUPOS} redirectTo="/grupos">
                  <GrupoForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="grupos/:id" 
              element={
                <ProtectedRoute permission={PERMISSIONS.VIEW_GRUPOS} redirectTo="/dashboard">
                  <GrupoDetalle />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="grupos/:id/editar" 
              element={
                <ProtectedRoute permission={PERMISSIONS.EDIT_GRUPOS} redirectTo="/grupos">
                  <GrupoForm />
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
            
            {/* Clientes Temporales - Solo admin */}
            <Route 
              path="clientes-temporales" 
              element={
                <ProtectedRoute section="admin" redirectTo="/dashboard">
                  <ClientesTemporales />
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
                  <RequireActiveShift>
                    <POSVentasPage />
                  </RequireActiveShift>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="pos/productos" 
              element={
                <ProtectedRoute permission={PERMISSIONS.VIEW_POS} redirectTo="/pos">
                  <POSProductos />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="pos/turnos" 
              element={
                <ProtectedRoute permission={PERMISSIONS.OPEN_SHIFT} redirectTo="/pos">
                  <POSTurnos />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="pos/cuentas" 
              element={
                <ProtectedRoute permission={PERMISSIONS.VIEW_MEMBER_ACCOUNTS} redirectTo="/pos">
                  <POSCuentas />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="pos/cuentas/:miembroUuid" 
              element={
                <ProtectedRoute permission={PERMISSIONS.VIEW_MEMBER_ACCOUNTS} redirectTo="/pos">
                  <CuentaDetailPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="pos/reportes" 
              element={
                <ProtectedRoute permission={PERMISSIONS.VIEW_SALES_REPORTS} redirectTo="/pos">
                  <POSReportes />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="pos/inventario" 
              element={
                <ProtectedRoute permission={PERMISSIONS.VIEW_INVENTORY} redirectTo="/pos">
                  <POSInventario />
                </ProtectedRoute>
              } 
            />
          </Route>
          
          {/* Login de Meseros - Público */}
          <Route path="/mesero-login" element={<MeseroLogin />} />
          
          {/* Ventas para Meseros - Requiere autenticación de mesero */}
          <Route path="/mesero/ventas" element={
            <RequireMeseroAuth>
              <RequireActiveShift>
                <POSVentasPage />
              </RequireActiveShift>
            </RequireMeseroAuth>
          } />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </AuthProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;