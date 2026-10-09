import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * False during SSR and the hydration pass, true afterwards. Used to defer
 * output that depends on the viewer's timezone or layout (dates, the scaled
 * poster) so server and client markup never disagree.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
