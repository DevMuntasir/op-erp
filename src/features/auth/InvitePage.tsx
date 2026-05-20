import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandLogo } from '@/src/components/layout';
import { useAuth } from '@/src/features/auth/AuthProvider';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

export function InvitePage() {
  const { token } = useParams();
  const { login } = useAuth();

  useEffect(() => {
    if (token) {
      localStorage.setItem('op_media_invite_token', token);
    }
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <Card className="w-full max-w-md overflow-hidden rounded-[2rem] border-zinc-200 shadow-2xl">
        <CardHeader className="space-y-6 bg-white pb-8 pt-10 text-center">
          <BrandLogo className="mx-auto w-32 md:w-48" />
          <div className="space-y-1">
            <CardTitle className="text-3xl font-black tracking-tight text-zinc-900">Invitation Accepted</CardTitle>
            <CardDescription className="font-medium text-zinc-500">
              Continue with the invited Google account to enter your workspace.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Button onClick={login} className="h-11 w-full bg-brand text-white hover:bg-zinc-800">
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
