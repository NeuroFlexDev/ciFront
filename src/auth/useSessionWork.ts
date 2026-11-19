import { useEffect } from 'react';

// A visible, mounted operation counts as activity while its owner waits.
// This never authenticates a user or extends the absolute session lifetime.
const operations = new Map<symbol, number>();

export function hasSessionWork(userId: number): boolean {
  return Array.from(operations.values()).some((owner) => owner === userId);
}

export function useSessionWork(userId: number | undefined, working: boolean) {
  useEffect(() => {
    if (!userId || !working) return;
    const operation = Symbol();
    operations.set(operation, userId);
    return () => {
      operations.delete(operation);
    };
  }, [userId, working]);
}
