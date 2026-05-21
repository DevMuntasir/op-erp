import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { GoogleAuthProvider, User as FirebaseUser, getRedirectResult, onAuthStateChanged, signInWithEmailAndPassword, signOut, signInWithPopup } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { acceptInvite, getCurrentUser } from '@/src/api/endpoints/auth.api';
import { auth, db } from '@/src/lib/firebase';
import { User } from '@/src/shared/types/domain';
import { toast } from 'sonner';

interface AuthContextValue {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: () => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  acceptInvitation: (code: string) => Promise<void>;
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

  const buildUserFromRecord = (record: any, firebaseUserOverride?: FirebaseUser | null): User => {
    const source = firebaseUserOverride ?? auth.currentUser;
    return {
      uid: record?.uid ?? source?.uid ?? '',
      email: record?.email ?? source?.email ?? null,
      name: record?.name ?? source?.displayName ?? source?.email?.split('@')[0] ?? 'User',
      role: record?.role ?? 'client',
      adminId: record?.adminId ?? null,
      status: record?.status ?? 'offline',
      lastSeen: record?.lastSeen ?? null,
      photoURL: record?.photoURL ?? source?.photoURL ?? null,
      phone: record?.phone ?? record?.phoneNumber ?? source?.phoneNumber ?? null,
      phoneNumber: record?.phoneNumber ?? record?.phone ?? source?.phoneNumber ?? null,
      createdAt: record?.createdAt ?? null,
      isDisabled: record?.isDisabled,
      disabledAt: record?.disabledAt,
    };
  };

  const getFirestoreFallbackUser = async (firebaseUserOverride?: FirebaseUser | null) => {
    const source = firebaseUserOverride ?? auth.currentUser;
    if (!source) return null;

    const collections = ['users', 'profiles'] as const;
    for (const collectionName of collections) {
      const snap = await getDoc(doc(db, collectionName, source.uid));
      if (snap.exists()) {
        return buildUserFromRecord(snap.data());
      }
    }

    if (source.email) {
      for (const collectionName of collections) {
        const byEmail = await getDocs(query(collection(db, collectionName), where('email', '==', source.email.toLowerCase()), limit(1)));
        if (!byEmail.empty) {
          return buildUserFromRecord(byEmail.docs[0].data(), source);
        }
      }
    }

    return buildUserFromRecord({}, source);
  };

  const refreshUser = async (firebaseUserOverride?: FirebaseUser | null) => {
    const source = firebaseUserOverride ?? auth.currentUser;
    if (!source) {
      setUser(null);
      return;
    }

    try {
      const current = await getCurrentUser();
      setUser({
        ...current,
        uid: current.uid ?? source.uid,
        email: current.email ?? source.email ?? null,
        name: current.name ?? source.displayName ?? source.email?.split('@')[0] ?? 'User',
        photoURL: current.photoURL ?? source.photoURL ?? null,
        phoneNumber: current.phone ?? current.phoneNumber ?? source.phoneNumber ?? null,
      });
    } catch (error) {
      const fallbackUser = await getFirestoreFallbackUser(source);
      setUser(fallbackUser);
      throw error;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      const redirectPending = localStorage.getItem(REDIRECT_IN_PROGRESS_KEY) === '1';

      try {
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult?.user) {
          console.log('Google redirect resolved for:', redirectResult.user.email);
        }
      } catch (error: any) {
        if (redirectPending) {
          console.error('Google redirect result failed', error);
          toast.error('Google sign-in failed', {
            description: error?.message || 'Unable to complete Google authentication.',
          });
        }
      } finally {
        localStorage.removeItem(REDIRECT_IN_PROGRESS_KEY);
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
          await refreshUser(nextUser);
        } catch (error: any) {
          console.error('Auth bootstrap fell back after API failure', error);
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
    localStorage.setItem(REDIRECT_IN_PROGRESS_KEY, '1');
    console.log('Starting Google auth with redirect flow');
    // await signInWithRedirect(auth, provider);
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const loginWithPassword = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const acceptInvitation = async (code: string) => {
    await acceptInvite(code.trim());
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      firebaseUser,
      loading,
      login,
      loginWithPassword,
      acceptInvitation,
      logout,
      refreshUser,
    }),
    [user, firebaseUser, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
