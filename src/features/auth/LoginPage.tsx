import { BrandLogo } from '@/src/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/src/features/auth/AuthProvider';
import { Loader2, LockKeyhole, Mail } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatefulButton } from '@/components/ui/stateful-button';
import { ApiClientError } from '@/src/shared/types/api';

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
      <path
        d="M21.805 10.023h-9.72v3.955h5.57c-.24 1.27-.96 2.346-2.04 3.066v2.547h3.3c1.93-1.777 3.04-4.396 3.04-7.5 0-.69-.06-1.37-.15-2.068Z"
        fill="#4285F4"
      />
      <path
        d="M12.085 22c2.76 0 5.08-.914 6.77-2.477l-3.3-2.547c-.918.615-2.088.98-3.47.98-2.668 0-4.93-1.8-5.74-4.223H2.94v2.627A10.217 10.217 0 0 0 12.085 22Z"
        fill="#34A853"
      />
      <path
        d="M6.345 13.733a6.146 6.146 0 0 1-.32-1.933c0-.672.115-1.325.32-1.933V7.24H2.94a10.217 10.217 0 0 0 0 9.12l3.405-2.627Z"
        fill="#FBBC04"
      />
      <path
        d="M12.085 5.645c1.5 0 2.846.516 3.906 1.53l2.93-2.93C17.16 2.606 14.84 1.6 12.085 1.6A10.217 10.217 0 0 0 2.94 7.24l3.405 2.627c.81-2.423 3.072-4.222 5.74-4.222Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function LoginPage() {
  const { login, loginWithPassword, user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showPassword = email.trim().length > 0;

  useEffect(() => {
    if (!user) return;
    navigate(user.role === 'client' ? '/client' : user.role === 'employee' ? '/employee' : '/admin', { replace: true });
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setGoogleSubmitting(true);

    try {
      await login();
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrorMessage(error.message);
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to continue. Please try again.');
      }
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!showPassword) return;

    setErrorMessage(null);
    setSubmitting(true);

    try {
      await loginWithPassword(email, password);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrorMessage(error.message);
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to continue. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white">
        <BrandLogo className="w-40 animate-pulse md:w-56" />
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f4ef] px-4 py-10">
      <Card className="w-full max-w-md rounded-[2rem] border border-zinc-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <CardHeader className="space-y-6 px-8 pt-10 text-center">
          <BrandLogo className="mx-auto w-32 md:w-40" />
          <div className="space-y-3">
            <CardTitle className="text-4xl font-semibold tracking-tight text-zinc-950">Log in or sign up</CardTitle>
            <CardDescription className="mx-auto max-w-sm text-base leading-7 text-zinc-600">
              You&apos;ll get smarter responses and can manage your CRM workspace from one place.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 px-8 pb-8">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || googleSubmitting || submitting}
            className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-full border border-zinc-300 bg-white px-6 text-base font-semibold text-zinc-900 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {googleSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </button>

          <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.28em] text-zinc-400">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="tracking-[0.22em]">Or</span>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-3">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="Email address"
                  className="h-14 rounded-full border-zinc-300 bg-white pl-14 pr-5 text-base"
                  autoComplete="email"
                  required
                />
              </div>

              {showPassword ? (
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="Password"
                    className="h-14 rounded-full border-zinc-300 bg-white pl-14 pr-5 text-base"
                    autoComplete="current-password"
                    required
                    autoFocus
                  />
                </div>
              ) : null}
            </div>

            {errorMessage ? <p className="text-sm font-medium text-red-600">{errorMessage}</p> : null}

            <StatefulButton
              type="submit"
              className="h-14 w-full rounded-full bg-zinc-950 text-base font-semibold text-white hover:bg-zinc-800"
              state={submitting ? 'loading' : 'idle'}
              idleText="Log in"
              loadingText="Logging in..."
              disabled={loading || submitting || googleSubmitting || !showPassword}
            />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
