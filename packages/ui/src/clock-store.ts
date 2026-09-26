"use client";

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let currentTime = 0;
let timer: ReturnType<typeof setInterval> | null = null;

function tick() {
  currentTime = Date.now();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    tick();
    timer = setInterval(tick, 30_000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export function useCurrentTime() {
  const timestamp = useSyncExternalStore(subscribe, () => currentTime, () => 0);
  return timestamp ? new Date(timestamp) : null;
}
