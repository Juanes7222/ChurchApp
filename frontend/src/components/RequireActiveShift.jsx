import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import usePOSStore from '../stores/posStore';

/**
 * Componente que verifica si hay un turno activo antes de mostrar el contenido
 * REGLA DE NEGOCIO: Sin turno no hay ventas
 */
const RequireActiveShift = ({ children }) => {
  ('RequireActiveShift: Component mounted');
  const initializeShift = usePOSStore(state => state.initializeShift);

  const { data: shiftData } = useQuery({
    queryKey: ['active-shift'],
    queryFn: async () => {
      ('RequireActiveShift: Fetching active shift...');
      const response = await api.get('/pos/caja-shifts/activo');
      ('RequireActiveShift: Response:', response.data);
      return response.data;
    },
    refetchInterval: 30000, // Revalidar cada 30 segundos
    retry: 1,
    staleTime: 0, // Siempre refetch al montar
  });
  
  // Sincronizar con el store cuando se carga el turno
  useEffect(() => {
    ('RequireActiveShift: useEffect triggered, shiftData:', shiftData);
    if (shiftData?.shift) {
      ('RequireActiveShift: Setting shift in store');
      initializeShift(shiftData.shift, null);
    } else if (shiftData && !shiftData.shift) {
      ('RequireActiveShift: No shift, clearing store');
      initializeShift(null, null);
    }
  }, [shiftData, initializeShift]);

  // Siempre renderizar children, dejar que ellos decidan qué mostrar
  return <>{children}</>;
};

export default RequireActiveShift;
