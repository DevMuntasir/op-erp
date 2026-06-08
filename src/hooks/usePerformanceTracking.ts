import { useEffect, useRef } from 'react';
import { performanceMonitor } from '@/src/lib/performanceMonitoring';

/**
 * Hook to track component render performance
 */
export function useRenderTime(componentName: string) {
  const renderStartRef = useRef<number>(0);

  useEffect(() => {
    renderStartRef.current = performance.now();

    return () => {
      if (renderStartRef.current) {
        const renderTime = performance.now() - renderStartRef.current;
        performanceMonitor.recordMetric({
          name: `${componentName}-render`,
          value: renderTime,
          unit: 'ms',
        });

        // Log slow renders in development
        if (process.env.NODE_ENV === 'development' && renderTime > 16) {
          console.warn(
            `⚠️ Slow render: ${componentName} took ${renderTime.toFixed(2)}ms (>16ms threshold)`
          );
        }
      }
    };
  }, [componentName]);
}

/**
 * Hook to track data fetching performance
 */
export function useQueryPerformance(
  queryName: string,
  isLoading: boolean,
  isError: boolean
) {
  const fetchStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading && !fetchStartRef.current) {
      fetchStartRef.current = performance.now();
    }

    if (!isLoading && fetchStartRef.current) {
      const fetchTime = performance.now() - fetchStartRef.current;
      performanceMonitor.recordMetric({
        name: `${queryName}-fetch`,
        value: fetchTime,
        unit: 'ms',
      });

      // Log slow queries
      if (process.env.NODE_ENV === 'development' && fetchTime > 1000) {
        console.warn(
          `⚠️ Slow query: ${queryName} took ${fetchTime.toFixed(2)}ms`
        );
      }

      fetchStartRef.current = null;
    }
  }, [isLoading, queryName, isError]);
}

/**
 * Hook to log list rendering performance (important for large lists)
 */
export function useListPerformance(
  listName: string,
  itemCount: number,
  visibleItemCount: number
) {
  useEffect(() => {
    performanceMonitor.recordMetric({
      name: `${listName}-visible-items`,
      value: visibleItemCount,
      unit: 'count',
    });

    if (process.env.NODE_ENV === 'development' && visibleItemCount > 100) {
      console.warn(
        `⚠️ Large list render: ${listName} rendering ${visibleItemCount}/${itemCount} items`
      );
    }
  }, [listName, itemCount, visibleItemCount]);
}

/**
 * Hook to track memory usage (useful for detecting leaks)
 */
export function useMemoryTracking(componentName: string) {
  useEffect(() => {
    if (
      performance.memory &&
      process.env.NODE_ENV === 'development'
    ) {
      const trackMemory = () => {
        const { usedJSHeapSize, jsHeapSizeLimit } = performance.memory;
        const usagePercent = (usedJSHeapSize / jsHeapSizeLimit) * 100;

        if (usagePercent > 90) {
          console.warn(
            `⚠️ High memory usage in ${componentName}: ${usagePercent.toFixed(1)}%`
          );
        }
      };

      const interval = setInterval(trackMemory, 5000);
      return () => clearInterval(interval);
    }
  }, [componentName]);
}
