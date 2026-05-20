import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { GoogleAuthProvider, User as FirebaseUser, getRedirectResult, onAuthStateChanged, signOut, signInWithRedirect } from 'firebase/auth';
import { getCurrentUser } from '@/src/api/endpoints/auth.api';
import { auth } from '@/src/lib/firebase';
import { User } from '@/src/shared/types/domain';
import { toast } from 'sonner';

interface AuthContextValue {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const REDIRECT_IN_PROGRESS_KEY = 'opm_google_redirect_in_progress';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    if (!auth.currentUser) {
      setUser(null);
      return;
    }
    const current = await getCurrentUser();
    setUser({
      ...current,
      phoneNumber: current.phone ?? current.phoneNumber ?? null,
    });
  };

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      const redirectPending = sessionStorage.getItem(REDIRECT_IN_PROGRESS_KEY) === '1';

      if (redirectPending) {
        try {
          await getRedirectResult(auth);
        } catch (error: any) {
          console.error('Google redirect result failed', error);
          toast.error('Google sign-in failed', {
            description: error?.message || 'Unable to complete Google authentication.',
          });
        } finally {
          sessionStorage.removeItem(REDIRECT_IN_PROGRESS_KEY);
        }
      }

      const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
        if (!isMounted) return;
        setFirebaseUser(nextUser);

        if (!nextUser) {
          setUser(null);
          setLoading(false);
          return;
        }

        try {
          await refreshUser();
        } catch (error: any) {
          console.error('Auth bootstrap failed', error);
          toast.error('Authentication failed', {
            description: error?.message || 'Unable to load your workspace.',
          });
          setUser(null);
        } finally {
          setLoading(false);
        }
      });

      return unsubscribe;
    };

    let unsubscribe: (() => void) | undefined;
    bootstrapAuth().then((cleanup) => {
      unsubscribe = cleanup;
    });

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account',
    });
    sessionStorage.setItem(REDIRECT_IN_PROGRESS_KEY, '1');
    console.log('Starting Google auth with redirect flow');
    await signInWithRedirect(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      firebaseUser,
      loading,
      login,
      logout,
      refreshUser,
    }),
    [user, firebaseUser, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
