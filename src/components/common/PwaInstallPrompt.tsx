import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, MonitorCheck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode (installed as PWA)
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast.success('OP Media App installed!', {
        description: 'You can now launch it from your home screen or desktop.',
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Listen for SW controlled event dispatched by workbox-window on autoUpdate
    const handleControlling = () => {
      setIsUpdating(true);
      toast.loading('Updating app…', {
        id: 'pwa-update',
        description: 'New version found. Reloading in a moment.',
      });
    };

    // workbox-window dispatches a CustomEvent on the window when SW takes control
    window.addEventListener('wb-controlling', handleControlling);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('wb-controlling', handleControlling);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Detect browser for targeted instructions
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);

      if (isIOS || isSafari) {
        toast.info('Install on iOS / Safari', {
          description: 'Tap the Share button (□↑) → then "Add to Home Screen".',
          duration: 6000,
        });
      } else if (isChrome) {
        toast.info('Install in Chrome', {
          description: 'Look for the install icon (⊕) in the address bar on the right side, then click "Install". If it\'s missing, use the production build (not dev server).',
          duration: 8000,
        });
      } else {
        toast.info('Install App', {
          description: 'Look for the install icon in your browser\'s address bar. On mobile, use your browser\'s "Add to Home Screen" option.',
          duration: 6000,
        });
      }
      return;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  // Installed & not updating — show installed badge
  if (isInstalled && !isUpdating) {
    return (
      <div className="hidden md:flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
        <MonitorCheck className="h-3.5 w-3.5" />
        <span>App Installed</span>
      </div>
    );
  }

  // SW is auto-updating — show spinner
  if (isUpdating) {
    return (
      <div className="hidden md:flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200 animate-pulse">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        <span>Updating…</span>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleInstallClick}
      className="gap-2 bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:from-indigo-950/40 dark:to-blue-950/40 dark:text-indigo-300 dark:border-indigo-800"
    >
      <Download className="h-4 w-4 text-indigo-600" />
      <span className="hidden sm:inline">Install App</span>
    </Button>
  );
};

