import { Workbox } from 'workbox-window';

let wb: Workbox | null = null;

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Service workers are not supported in this browser.');
    return;
  }

  // In dev mode, vite-plugin-pwa does NOT generate /sw.js (devOptions.enabled: false).
  // Skip registration entirely to avoid crashes and 404 errors.
  if (import.meta.env.DEV) {
    console.log('[PWA] Dev mode — service worker registration skipped.');
    return;
  }

  try {
    // vite-plugin-pwa generates /sw.js at build time.
    wb = new Workbox('/sw.js');

    wb.addEventListener('installed', (event) => {
      if (event.isUpdate) {
        console.log('[PWA] New version installed, activating…');
      } else {
        console.log('[PWA] Service worker installed for the first time.');
      }
    });

    wb.addEventListener('activated', (event) => {
      if (event.isUpdate) {
        // Reload so the user gets the freshest assets from the new SW
        console.log('[PWA] New version activated — reloading for fresh content.');
        window.location.reload();
      } else {
        console.log('[PWA] Service worker activated. App is ready for offline use.');
      }
    });

    wb.addEventListener('waiting', () => {
      // New SW is waiting — send skip-waiting so it activates immediately
      console.log('[PWA] New SW waiting — sending skip-waiting message.');
      wb?.messageSkipWaiting();
    });

    wb.addEventListener('controlling', () => {
      console.log('[PWA] New SW is now controlling the page.');
    });

    wb.register().catch((err) => {
      console.warn('[PWA] Service worker registration failed:', err);
    });
  } catch (err) {
    console.warn('[PWA] Unexpected error initialising service worker:', err);
  }
}

/** Force the waiting service worker to activate immediately. */
export function skipWaiting(): void {
  wb?.messageSkipWaiting();
}
