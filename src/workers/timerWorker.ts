// Web Worker to maintain accurate background timers for auto-screenshots
// Browser throttles setTimeout/setInterval in inactive tabs, but Web Workers run continuously.

let timerId: number | null = null;

self.onmessage = (event: MessageEvent) => {
  const { command, delay } = event.data;

  if (command === 'start') {
    if (timerId !== null) {
      clearInterval(timerId);
    }
    const intervalMs = delay || 15000;
    timerId = self.setInterval(() => {
      self.postMessage({ type: 'tick' });
    }, intervalMs) as unknown as number;
  } else if (command === 'stop') {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }
};
