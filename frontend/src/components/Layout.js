import { useState, useCallback, useMemo } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CanAccessSection } from './PermissionGuard';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
  ChurchIcon, 
  LayoutDashboard, 
  Users, 
  UsersRound, 
  LogOut,
  Menu,
  X,
  Shield,
  ShoppingCart
} from 'lucide-react';
import { toast } from 'sonner';
import churchLogo from '../assets/img/logo-mmm.png';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = useCallback(() => {
    logout();
    toast.success('Sesión cerrada');
    navigate('/login');
  }, [logout, navigate]);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);

  const isActive = useCallback(
    (href) => location.pathname === href || location.pathname.startsWith(href + '/'),
    [location.pathname]
  );

  // Memoizar el cálculo de las clases CSS para los links
  const getLinkClassName = useCallback((path) => {
    return `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
      isActive(path)
        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' 
        : 'text-gray-700 hover:bg-gray-100'
    }`;
  }, [isActive]);

  const getPOSLinkClassName = useCallback((path) => {
    return `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
      isActive(path)
        ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md' 
        : 'text-gray-700 hover:bg-gray-100'
    }`;
  }, [isActive]);

  // Memoizar el avatar inicial
  const avatarFallback = useMemo(() => {
    return user?.name?.[0] || user?.email?.[0] || 'U';
  }, [user?.name, user?.email]);

  // Memoizar el nombre a mostrar
  const displayName = useMemo(() => {
    return user?.name || user?.email;
  }, [user?.name, user?.email]);

  // Memoizar el rol formateado
  const formattedRole = useMemo(() => {
    return user?.role?.replace('_', ' ');
  }, [user?.role]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 shadow-lg
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
            <Link to="/dashboard" className="flex items-center gap-3" data-testid="logo-link">
              <img 
                src={churchLogo} 
                alt="Logo Iglesia" 
                className="h-10 w-auto object-contain"
              />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Iglesia
              </span>
            </Link>
            <button
              onClick={closeSidebar}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {/* Dashboard - Visible para todos */}
            <CanAccessSection section="dashboard">
              <Link
                to="/dashboard"
                onClick={closeSidebar}
                data-testid="nav-dashboard"
                className={getLinkClassName('/dashboard')}
              >
                <LayoutDashboard className="h-5 w-5" />
                <span>Dashboard</span>
              </Link>
            </CanAccessSection>

            {/* Miembros - Solo admin, pastor, secretaria */}
            <CanAccessSection section="miembros">
              <Link
                to="/miembros"
                onClick={closeSidebar}
                data-testid="nav-miembros"
                className={getLinkClassName('/miembros')}
              >
                <Users className="h-5 w-5" />
                <span>Miembros</span>
              </Link>
            </CanAccessSection>
            {/* Grupos - Solo admin, pastor, secretaria */}
            <CanAccessSection section="grupos">
              <Link
                to="/grupos"
                onClick={closeSidebar}
                data-testid="nav-grupos"
                className={getLinkClassName('/grupos')}
              >
                <UsersRound className="h-5 w-5" />
                <span>Grupos</span>
              </Link>
            </CanAccessSection>
            {/* POS/Restaurante - Solo agente_restaurante, ayudante_restaurante, admin */}
            <CanAccessSection section="pos">
              <Link
                to="/pos"
                onClick={closeSidebar}
                data-testid="nav-pos"
                className={getPOSLinkClassName('/pos')}
              >
                <ShoppingCart className="h-5 w-5" />
                <span>Restaurante</span>
              </Link>
            </CanAccessSection>

            {/* Admin - Solo admin */}
            <CanAccessSection section="admin">
              <Link
                to="/admin"
                onClick={closeSidebar}
                data-testid="nav-admin"
                className={getLinkClassName('/admin')}
              >
                <Shield className="h-5 w-5" />
                <span>Administración</span>
              </Link>
            </CanAccessSection>
          </nav>

          {/* User profile */}
          <div className="p-4 border-t border-gray-200 space-y-3">
            <div className="flex items-center gap-3 px-2">
              <Avatar>
                <AvatarImage src={user?.picture} />
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                  {avatarFallback}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {displayName}
                </p>
                <p className="text-xs text-gray-600 capitalize">
                  {formattedRole}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start text-gray-700 hover:text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 h-16 bg-white border-b border-gray-200 px-4 flex items-center justify-between shadow-sm">
          <button
            onClick={openSidebar}
            className="p-2 rounded-lg hover:bg-gray-100"
            data-testid="mobile-menu-button"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <ChurchIcon className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              MMM Cartago
            </span>
          </div>
          <div className="w-10" /> {/* Spacer for centering */}
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;