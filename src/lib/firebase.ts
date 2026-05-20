import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, browserPopupRedirectResolver } from 'firebase/auth';
import { 
  getFirestore, doc, getDocFromServer, initializeFirestore, 
  enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED 
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize core app
const app = initializeApp(firebaseConfig);

// Initialize Firestore with settings to resolve connectivity issues in some environments
// Force long polling if WebSockets are failing (common in proxied environments)
const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
export let db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
}, dbId);

// Test connectivity and fallback to (default) if named database fails
(async () => {
  try {
    await getDocFromServer(doc(db, '_healthcheck', 'ping'));
    console.log(`✅ Connected to Firestore Database: ${dbId}`);
  } catch (err: any) {
    const isConnectivityError = err.code === 'unavailable' || err.message?.includes('offline') || err.message?.includes('Could not reach');
    const isPermissionError = err.code === 'permission-denied' || err.message?.includes('permission');

    if ((isPermissionError || isConnectivityError) && dbId !== '(default)') {
      console.warn(`⚠️ Issue with Database ${dbId} (${err.code}). Trying (default)...`);
      try {
        db = initializeFirestore(app, {
          experimentalForceLongPolling: true,
          cacheSizeBytes: CACHE_SIZE_UNLIMITED,
        }, '(default)');
        await getDocFromServer(doc(db, '_healthcheck', 'ping'));
        console.log("✅ Switched to (default) database successfully");
      } catch (fallbackErr: any) {
        console.error("❌ Fallback to (default) database also failed:", fallbackErr.message);
      }
    } else {
      console.error(`❌ Firestore connectivity error for ${dbId}:`, err.message);
    }
  }
})();

// Enable offline persistence
/*
enableIndexedDbPersistence(db, { forceOwnership: true }).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a a time.
    console.warn('Firestore persistence failed-precondition (multiple tabs)');
  } else if (err.code === 'unimplemented') {
    // The current browser doesn't support all of the features required to enable persistence
    console.warn('Firestore persistence unimplemented');
  } else {
    console.error('Firestore persistence error:', err);
  }
});
*/

export const auth = getAuth(app);
// Ensure persistence is set to handle session state across reloads/proxies
setPersistence(auth, browserLocalPersistence).catch(err => {
  console.error("Auth persistence error:", err);
});

export const storage = getStorage(app);

// Secondary app for admin tasks
const adminApp = initializeApp(firebaseConfig, 'AdminApp');
export const adminAuth = getAuth(adminApp);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  // Use a timeout for the connection test to avoid hanging
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error("Connection test timed out after 20s")), 20000)
  );

  try {
    console.log("Starting Firestore connectivity test...");
    // Try to get a non-existent document from a known collection to verify backend reachability
    const connDocPromise = getDocFromServer(doc(db, '_healthcheck', 'ping'));
    await Promise.race([connDocPromise, timeoutPromise]);
    console.log("✅ Firestore connection test successful (backend reached)");
  } catch (error: any) {
    if (error.message?.includes('timed out')) {
      console.warn("⚠️ Firestore connection test timed out. The backend might be slow to respond or blocked.");
    } else if (error.code === 'unavailable' || error.message?.includes('offline')) {
      console.error("❌ Firestore backend is unreachable. Check network/config.");
    } else if (error.code === 'permission-denied') {
      console.info("ℹ️ Firestore reached (Permission Denied as expected).");
    } else {
      console.error("⚠️ Firestore connection test result:", error.message || error);
    }
  }
}

testConnection();
