import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Users, UsersRound, UserPlus, TrendingUp } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_miembros: 0,
    total_grupos: 0,
    recent_miembros: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Miembros',
      value: stats.total_miembros,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      link: '/miembros',
      testId: 'stat-total-miembros'
    },
    {
      title: 'Grupos Activos',
      value: stats.total_grupos,
      icon: UsersRound,
      color: 'from-indigo-500 to-indigo-600',
      link: '/grupos',
      testId: 'stat-total-grupos'
    },
    {
      title: 'Nuevos (30 días)',
      value: stats.recent_miembros,
      icon: UserPlus,
      color: 'from-emerald-500 to-emerald-600',
      link: '/miembros',
      testId: 'stat-recent-miembros'
    },
  ];

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Resumen general del sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} to={stat.link}>
              <Card 
                className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-none shadow-md"
                data-testid={stat.testId}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">
                    {loading ? (
                      <div className="h-9 w-16 bg-gray-200 rounded animate-pulse" />
                    ) : (
                      stat.value
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Acciones Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link 
                to="/miembros/nuevo"
                className="block p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                data-testid="quick-action-new-member"
              >
                <p className="font-medium text-gray-900">Registrar Nuevo Miembro</p>
                <p className="text-sm text-gray-600 mt-1">Agregar un nuevo miembro a la base de datos</p>
              </Link>
              <Link 
                to="/grupos"
                className="block p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
                data-testid="quick-action-manage-groups"
              >
                <p className="font-medium text-gray-900">Gestionar Grupos</p>
                <p className="text-sm text-gray-600 mt-1">Administrar grupos y asignaciones</p>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle>Información del Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Versión</span>
                <span className="text-sm font-medium">1.0.0</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Estado</span>
                <span className="text-sm font-medium text-emerald-600">Operativo</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;