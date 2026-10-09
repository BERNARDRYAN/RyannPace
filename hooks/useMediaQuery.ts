import { useCallback, useSyncExternalStore } from 'react';

/**
 * Live `matchMedia` result. During SSR and hydration it returns `serverValue`
 * (no mismatch); right after hydration it switches to the real value.
 */
export function useMediaQuery(query: string, serverValue = true): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query]
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue
  );
}
