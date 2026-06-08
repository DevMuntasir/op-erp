/**
 * Performance monitoring utilities for tracking Core Web Vitals and custom metrics
 * Tracks: LCP (Largest Contentful Paint), FID (First Input Delay), CLS (Cumulative Layout Shift)
 * Plus custom metrics for app-specific performance
 */

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

interface CoreWebVital {
  name: 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'FCP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private isEnabled = true;
  private observers: Map<string, PerformanceObserver> = new Map();

  constructor() {
    this.initializeWebVitals();
  }

  /**
   * Track Core Web Vitals using browser APIs
   */
  private initializeWebVitals() {
    if (!this.isEnabled || typeof window === 'undefined') return;

    // Largest Contentful Paint (LCP)
    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric({
          name: 'LCP',
          value: lastEntry.renderTime || lastEntry.loadTime,
          unit: 'ms',
        });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.set('LCP', lcpObserver);
    } catch (e) {
      console.warn('LCP monitoring not available:', e);
    }

    // First Input Delay (FID)
    try {
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry) => {
          this.recordMetric({
            name: 'FID',
            value: (entry as any).processingDuration,
            unit: 'ms',
          });
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.set('FID', fidObserver);
    } catch (e) {
      console.warn('FID monitoring not available:', e);
    }

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    try {
      const clsObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry) => {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
            this.recordMetric({
              name: 'CLS',
              value: clsValue,
              unit: 'score',
            });
          }
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('CLS', clsObserver);
    } catch (e) {
      console.warn('CLS monitoring not available:', e);
    }

    // First Contentful Paint (FCP)
    if (performance.getEntriesByType) {
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find((entry) => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        this.recordMetric({
          name: 'FCP',
          value: fcpEntry.startTime,
          unit: 'ms',
        });
      }
    }

    // Time to First Byte (TTFB)
    if (performance.timing) {
      const ttfb = performance.timing.responseStart - performance.timing.navigationStart;
      this.recordMetric({
        name: 'TTFB',
        value: ttfb,
        unit: 'ms',
      });
    }
  }

  /**
   * Record a custom performance metric
   */
  recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>) {
    if (!this.isEnabled) return;

    this.metrics.push({
      ...metric,
      timestamp: Date.now(),
    });

    // Keep only last 100 metrics in memory
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }
  }

  /**
   * Measure execution time of a function
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      const duration = performance.now() - start;
      this.recordMetric({
        name,
        value: duration,
        unit: 'ms',
      });
    }
  }

  /**
   * Measure execution time of a synchronous function
   */
  measure<T>(name: string, fn: () => T): T {
    const start = performance.now();
    try {
      return fn();
    } finally {
      const duration = performance.now() - start;
      this.recordMetric({
        name,
        value: duration,
        unit: 'ms',
      });
    }
  }

  /**
   * Start a performance mark
   */
  mark(name: string) {
    if (performance.mark) {
      performance.mark(name);
    }
  }

  /**
   * End a performance measure
   */
  measure_mark(startMark: string, endMark: string) {
    try {
      if (performance.measure) {
        performance.measure(endMark, startMark, endMark);
      }
    } catch (e) {
      console.warn('Failed to measure marks:', e);
    }
  }

  /**
   * Get Core Web Vitals assessment
   */
  getWebVitalsAssessment(): CoreWebVital[] {
    const lcpMetric = this.metrics.find((m) => m.name === 'LCP');
    const fidMetric = this.metrics.find((m) => m.name === 'FID');
    const clsMetric = this.metrics.find((m) => m.name === 'CLS');

    return [
      {
        name: 'LCP',
        value: lcpMetric?.value ?? 0,
        rating:
          (lcpMetric?.value ?? 0) <= 2500
            ? 'good'
            : (lcpMetric?.value ?? 0) <= 4000
              ? 'needs-improvement'
              : 'poor',
      },
      {
        name: 'FID',
        value: fidMetric?.value ?? 0,
        rating:
          (fidMetric?.value ?? 0) <= 100
            ? 'good'
            : (fidMetric?.value ?? 0) <= 300
              ? 'needs-improvement'
              : 'poor',
      },
      {
        name: 'CLS',
        value: clsMetric?.value ?? 0,
        rating:
          (clsMetric?.value ?? 0) <= 0.1
            ? 'good'
            : (clsMetric?.value ?? 0) <= 0.25
              ? 'needs-improvement'
              : 'poor',
      },
    ];
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get average value for a metric
   */
  getMetricAverage(name: string): number {
    const metricValues = this.metrics
      .filter((m) => m.name === name)
      .map((m) => m.value);

    if (metricValues.length === 0) return 0;
    return metricValues.reduce((a, b) => a + b, 0) / metricValues.length;
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = [];
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  /**
   * Cleanup observers
   */
  cleanup() {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers.clear();
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * React hook for measuring component render time
 */
export function useComponentPerformance(componentName: string) {
  const markStart = `${componentName}-render-start`;
  const markEnd = `${componentName}-render-end`;

  performanceMonitor.mark(markStart);

  return () => {
    performanceMonitor.mark(markEnd);
    performanceMonitor.measure_mark(markStart, markEnd);
  };
}

/**
 * Log performance metrics (for debugging)
 */
export function logPerformanceMetrics() {
  if (process.env.NODE_ENV === 'development') {
    const metrics = performanceMonitor.getMetrics();
    const vitals = performanceMonitor.getWebVitalsAssessment();

    console.group('⚡ Performance Metrics');
    console.table(vitals);
    console.group('Recent Metrics');
    console.table(metrics.slice(-10));
    console.groupEnd();
    console.groupEnd();
  }
}
