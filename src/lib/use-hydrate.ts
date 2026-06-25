'use client';

import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/**
 * Returns true after the component has mounted on the client.
 * Use this to avoid hydration mismatches when reading from
 * persisted Zustand stores (localStorage) on first render.
 *
 * Implemented with useSyncExternalStore to avoid the
 * "setState in effect" lint rule.
 */
export function useHydrate(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true, // client snapshot: always true
    () => false // server snapshot: always false
  );
}
