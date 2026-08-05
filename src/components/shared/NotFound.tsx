import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/**
 * Catch-all 404 page, rendered for unknown URLs at the top level and inside
 * each role area. The home link goes to "/", which RootRedirect resolves to
 * the signed-in user's own dashboard.
 */
export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="text-center">
        <p className="text-7xl font-black tracking-tighter text-zinc-200">404</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-900">Page not found</h1>
        <p className="mt-2 text-sm text-zinc-500">
          The page you're looking for doesn't exist or may have been moved.
        </p>
        <Button onClick={() => navigate('/')} className="mt-6 bg-zinc-900 text-white hover:bg-zinc-800">
          Back to dashboard
        </Button>
      </div>
    </div>
  );
}
