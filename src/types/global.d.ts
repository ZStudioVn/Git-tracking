import type { GitTrackingBridge } from '@/types/desktop';

declare global {
  interface Window {
    gitTracking?: GitTrackingBridge;
  }
}

export {};
