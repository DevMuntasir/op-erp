import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { GoogleAuthProvider, User as FirebaseUser, onAuthStateChanged, signInWithEmailAndPassword, signOut, signInWithPopup } from 'firebase/auth';
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
const INVITE_TOKEN_KEY = 'op_media_invite_token';

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
      // On a transient API failure, keep the last-known role for the same account
      // instead of silently downgrading to the fallback's default 'client' role.
      setUser((prev) => (prev && prev.uid === fallbackUser?.uid ? prev : fallbackUser));
      throw error;
    }
  };

  // If the user arrived via an invite link (InvitePage stores the token),
  // redeem it right after sign-in so their account gets linked to the invitation.
  const redeemPendingInvite = async () => {
    const token = localStorage.getItem(INVITE_TOKEN_KEY);
    if (!token) return;
    try {
      await acceptInvite(token.trim());
      localStorage.removeItem(INVITE_TOKEN_KEY);
      toast.success('Invitation accepted', { description: 'Your account has been linked to the workspace.' });
    } catch (error: any) {
      localStorage.removeItem(INVITE_TOKEN_KEY);
      toast.error('Could not accept the invitation', {
        description: error?.message || 'The invite link may be invalid or expired. Ask your admin to resend it.',
      });
    }
  };

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!isMounted) return;
      setFirebaseUser(nextUser);

      if (!nextUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      await redeemPendingInvite();

      try {
        await refreshUser(nextUser);
      } catch (error: any) {
        console.error('Auth bootstrap fell back after API failure', error);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account',
    });
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
