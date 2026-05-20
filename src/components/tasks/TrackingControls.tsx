import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/App';
import { listTasks } from '@/src/api/endpoints/tasks.api';
import { listSessions, stopSession } from '@/src/api/endpoints/sessions.api';
import { uploadScreenshot } from '@/src/api/endpoints/screenshots.api';
import { queryKeys } from '@/src/shared/constants/query-keys';
import { Session, Task } from '@/src/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Square, Camera, Clock, Loader2, Briefcase, CheckSquare, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { startTaskWork } from '@/src/shared/tasks/start-task-work';

const AUTO_SCREENSHOT_DELAY_MS = 15 * 1000;
const SAFE_CAPTURE_COLOR = '#18181b';
const SAFE_CAPTURE_BG = '#ffffff';
const UNSUPPORTED_COLOR_FUNCTION_PATTERN = /(oklch|oklab|lab|lch|color|color-mix|light-dark)\s*\((?:[^()]*|\((?:[^()]*|\([^()]*\))*\))*\)/gi;
const UNSUPPORTED_COLOR_HINT_PATTERN = /in\s+(oklb|oklch|oklab|oklab-linear|oklch-linear|lab|lch|srgb-linear|display-p3|a98-rgb|prophoto-rgb|rec2020|xyz|xyz-d50|xyz-d65)/gi;

const sanitizeCaptureCss = (value: string, fallback = SAFE_CAPTURE_COLOR) => {
  let nextValue = value;
  for (let i = 0; i < 3; i += 1) {
    nextValue = nextValue.replace(UNSUPPORTED_COLOR_FUNCTION_PATTERN, fallback);
  }
  return nextValue.replace(UNSUPPORTED_COLOR_HINT_PATTERN, 'in srgb');
};

const sanitizeClonedDocument = (clonedDoc: Document) => {
  const styleTags = Array.from(clonedDoc.getElementsByTagName('style'));
  styleTags.forEach((tag) => {
    try {
      tag.innerHTML = sanitizeCaptureCss(tag.innerHTML);
    } catch (error) {
      console.warn('Could not sanitize capture style tag', error);
    }
  });

  const rootStyle = clonedDoc.createElement('style');
  rootStyle.innerHTML = `
    :root {
      --background: ${SAFE_CAPTURE_BG} !important;
      --foreground: #09090b !important;
      --primary: ${SAFE_CAPTURE_COLOR} !important;
      --primary-foreground: ${SAFE_CAPTURE_BG} !important;
      --secondary: #f4f4f5 !important;
      --secondary-foreground: ${SAFE_CAPTURE_COLOR} !important;
      --muted: #f4f4f5 !important;
      --muted-foreground: #71717a !important;
      --accent: #f4f4f5 !important;
      --accent-foreground: ${SAFE_CAPTURE_COLOR} !important;
      --border: #e4e4e7 !important;
      --input: #e4e4e7 !important;
      --ring: #a1a1aa !important;
      --card: ${SAFE_CAPTURE_BG} !important;
      --card-foreground: ${SAFE_CAPTURE_COLOR} !important;
      --popover: ${SAFE_CAPTURE_BG} !important;
      --popover-foreground: ${SAFE_CAPTURE_COLOR} !important;
      --zinc-50: #fafafa !important;
      --zinc-100: #f4f4f5 !important;
      --zinc-200: #e4e4e7 !important;
      --zinc-300: #d4d4d8 !important;
      --zinc-400: #a1a1aa !important;
      --zinc-500: #71717a !important;
      --zinc-600: #52525b !important;
      --zinc-700: #3f3f46 !important;
      --zinc-800: #27272a !important;
      --zinc-900: #18181b !important;
      --zinc-950: #09090b !important;
      --color-zinc-50: #fafafa !important;
      --color-zinc-100: #f4f4f5 !important;
      --color-zinc-200: #e4e4e7 !important;
      --color-zinc-300: #d4d4d8 !important;
      --color-zinc-400: #a1a1aa !important;
      --color-zinc-500: #71717a !important;
      --color-zinc-600: #52525b !important;
      --color-zinc-700: #3f3f46 !important;
      --color-zinc-800: #27272a !important;
      --color-zinc-900: #18181b !important;
      --color-zinc-950: #09090b !important;
    }
    * {
      color-scheme: light !important;
    }
  `;
  (clonedDoc.head || clonedDoc.documentElement).appendChild(rootStyle);

  clonedDoc.querySelectorAll<HTMLElement>('*').forEach((element) => {
    const inlineStyle = element.getAttribute('style');
    if (inlineStyle && /oklch|oklab|color\(|color-mix|light-dark|lab\(|lch\(/i.test(inlineStyle)) {
      element.setAttribute('style', sanitizeCaptureCss(inlineStyle));
    }

    const colorProps = [
      'color',
      'backgroundColor',
      'borderColor',
      'outlineColor',
      'fill',
      'stroke',
      'boxShadow',
      'textShadow',
      'backgroundImage',
    ] as const;

    colorProps.forEach((prop) => {
      const currentValue = (element.style as CSSStyleDeclaration)[prop];
      if (!currentValue || !/oklch|oklab|color\(|color-mix|light-dark|lab\(|lch\(|\sin\s/i.test(currentValue)) {
        return;
      }

      if (prop === 'backgroundImage' || prop === 'boxShadow' || prop === 'textShadow') {
        element.style.setProperty(prop === 'backgroundImage' ? 'background-image' : prop, 'none', 'important');
        return;
      }

      const cssPropName = prop.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
      const fallback = prop === 'backgroundColor' ? SAFE_CAPTURE_BG : SAFE_CAPTURE_COLOR;
      element.style.setProperty(cssPropName, fallback, 'important');
    });
  });
};

export const TrackingControls = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const timerRef = useRef<number | null>(null);
  const screenshotTimeoutRef = useRef<number | null>(null);

  const tasksQuery = useQuery({
    queryKey: queryKeys.tasks({ assigned: 'me' }),
    queryFn: listTasks,
    enabled: !!user,
  });

  const sessionsQuery = useQuery({
    queryKey: queryKeys.sessions({ scope: 'me' }),
    queryFn: listSessions,
    enabled: !!user,
    refetchInterval: 10_000,
  });

  const activeSession = useMemo<Session | null>(() => {
    if (!user) return null;
    return (
      sessionsQuery.data?.find((session) => session.userId === user.uid && session.status === 'active') ?? null
    );
  }, [sessionsQuery.data, user]);

  const tasks = useMemo<Task[]>(() => {
    if (!user) return [];
    return (
      tasksQuery.data?.filter(
        (task) =>
          task.assignedTo === user.uid &&
          !task.isDeleted &&
          (task.status === 'pending' || task.status === 'in-progress'),
      ) ?? []
    );
  }, [tasksQuery.data, user]);

  useEffect(() => {
    if (activeSession?.taskId) {
      setSelectedTaskId(activeSession.taskId);
    }
  }, [activeSession?.taskId]);

  useEffect(() => {
    if (!activeSession?.startTime) {
      setElapsedTime(0);
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      return;
    }

    const startAt = new Date(activeSession.startTime).getTime();
    setElapsedTime(Math.max(0, Math.floor((Date.now() - startAt) / 1000)));

    timerRef.current = window.setInterval(() => {
      setElapsedTime(Math.max(0, Math.floor((Date.now() - startAt) / 1000)));
    }, 1000);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [activeSession?.id, activeSession?.startTime]);

  const scheduleScreenshot = (sessionId: string) => {
    if (screenshotTimeoutRef.current) {
      window.clearTimeout(screenshotTimeoutRef.current);
    }
    screenshotTimeoutRef.current = window.setTimeout(async () => {
      await captureScreenshot(sessionId);
      scheduleScreenshot(sessionId);
    }, AUTO_SCREENSHOT_DELAY_MS);
  };

  useEffect(() => {
    if (activeSession?.id) {
      scheduleScreenshot(activeSession.id);
    } else if (screenshotTimeoutRef.current) {
      window.clearTimeout(screenshotTimeoutRef.current);
    }

    return () => {
      if (screenshotTimeoutRef.current) {
        window.clearTimeout(screenshotTimeoutRef.current);
      }
    };
  }, [activeSession?.id]);

  const startMutation = useMutation({
    mutationFn: async () => {
      const selectedTask = tasks.find((task) => task.id === selectedTaskId);
      if (!selectedTask) {
        throw new Error('Select a task before starting tracking.');
      }
      return startTaskWork(selectedTask, { activeSession });
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks({ assigned: 'me' }) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks({ dashboard: true }) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.sessions({ scope: 'me' }) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.sessions({ dashboard: true }) }),
      ]);
      toast.success(result.sessionStarted ? 'Task started and tracking enabled' : 'Tracking is already active for this task');
    },
    onError: (error: Error) => {
      toast.error('Failed to start task', { description: error.message });
    },
  });

  const stopMutation = useMutation({
    mutationFn: stopSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions({ scope: 'me' }) });
      toast.success('Session ended');
    },
    onError: (error: Error) => {
      toast.error('Failed to stop session', { description: error.message });
    },
  });

  const screenshotMutation = useMutation({
    mutationFn: uploadScreenshot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.screenshots({ scope: 'me' }) });
    },
  });

  const captureScreenshot = async (sessionId: string) => {
    let imageBase64: string;

    try {
      setIsCapturing(true);
      const captureEl = document.getElementById('root') || document.body;
      const canvas = await html2canvas(captureEl, {
        scale: 1,
        logging: false,
        useCORS: true,
        allowTaint: false,
        proxy: window.location.origin + '/api/proxy-image',
        backgroundColor: SAFE_CAPTURE_BG,
        ignoreElements: (el) => el.classList.contains('tracking-controls-container') || el.classList.contains('tracking-controls-fixed'),
        onclone: (clonedDoc) => {
          sanitizeClonedDocument(clonedDoc);
        },
      });

      imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
    } catch (error: any) {
      toast.error('Screenshot capture failed', { description: error?.message || 'Unable to render screenshot.' });
      setIsCapturing(false);
      return;
    }

    try {
      await screenshotMutation.mutateAsync({ sessionId, imageBase64, screenshotUrl: imageBase64, storagePath: imageBase64 });
      toast.success('Screenshot captured');
    } catch (error: any) {
      toast.error('Screenshot upload failed', { description: error?.message || 'Unknown error' });
    } finally {
      setIsCapturing(false);
    }
  };

  const formatElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map((part) => String(part).padStart(2, '0')).join(':');
  };

  return (
    <div className="tracking-controls-fixed flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-2 py-1 shadow-sm">
      <div className="hidden items-center gap-2 md:flex">
        <Badge variant={activeSession ? 'default' : 'secondary'} className={activeSession ? 'bg-emerald-600 text-white' : ''}>
          {activeSession ? 'Active Session' : 'Idle'}
        </Badge>
      </div>

      <div className="hidden items-center gap-2 lg:flex">
        <Briefcase className="h-4 w-4 text-zinc-400" />
        <Select value={selectedTaskId} onValueChange={setSelectedTaskId} disabled={!!activeSession || !tasks.length}>
          <SelectTrigger className="h-9 w-[180px] border-none bg-transparent px-0 shadow-none focus:ring-0">
            <SelectValue placeholder="Select task" />
          </SelectTrigger>
          <SelectContent>
            {tasks.map((task) => (
              <SelectItem key={task.id} value={task.id}>
                {task.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2 text-sm font-bold text-zinc-700">
        <Clock className="h-4 w-4 text-zinc-400" />
        {formatElapsed(elapsedTime)}
      </div>

      {activeSession ? (
        <>
          <Button variant="outline" size="sm" className="gap-2" disabled={isCapturing} onClick={() => captureScreenshot(activeSession.id)}>
            {isCapturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            <span className="hidden sm:inline">Capture</span>
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-red-600 text-white hover:bg-red-700"
            disabled={stopMutation.isPending}
            onClick={() =>
              stopMutation.mutate({
                sessionId: activeSession.id,
                activeTimeSec: Math.max(activeSession.activeTime ?? 0, elapsedTime),
              })
            }
          >
            {stopMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
            <span className="hidden sm:inline">Stop</span>
          </Button>
        </>
      ) : (
        <Button
          size="sm"
      
          disabled={startMutation.isPending || !selectedTaskId}
          onClick={() => startMutation.mutate()}
        >
          {startMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          <span className="hidden sm:inline">Start</span>
        </Button>
      )}

      <div className="hidden items-center gap-1 text-xs text-zinc-400 xl:flex">
        <Monitor className="h-3.5 w-3.5" />
        Monitoring enabled
      </div>
      <div className="hidden items-center gap-1 text-xs text-zinc-400 xl:flex">
        <CheckSquare className="h-3.5 w-3.5" />
        {tasks.length} open tasks
      </div>
    </div>
  );
};
