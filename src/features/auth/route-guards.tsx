import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/src/features/auth/AuthProvider';
import { UserRole } from '@/src/shared/types/domain';

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
    </div>
  );
}

export function ProtectedRoute({ roles }: { roles: UserRole[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <FullScreenLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!roles.includes(user.role)) {
    const redirect =
      user.role === 'client'
        ? '/client'
        : user.role === 'employee'
          ? '/employee'
          : user.role === 'super_admin'
            ? '/super-admin'
            : '/admin';
    return <Navigate to={redirect} replace />;
  }

  return <Outlet />;
}

export function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullScreenLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'client') {
    return <Navigate to="/client" replace />;
  }

  if (user.role === 'employee') {
    return <Navigate to="/employee" replace />;
  }

  if (user.role === 'super_admin') {
    return <Navigate to="/super-admin" replace />;
  }

  return <Navigate to="/admin" replace />;
}
