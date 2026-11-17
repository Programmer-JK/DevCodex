import { useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as BeforeInstallPromptEvent; listeners.forEach((l) => l()); });
addEventListener('appinstalled', () => { deferred = null; listeners.forEach((l) => l()); });

export const useInstallPrompt = () =>
  useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => deferred);

export async function promptInstall() {
  if (!deferred) return;
  await deferred.prompt();
  await deferred.userChoice;
  deferred = null;
  listeners.forEach((l) => l());
}

export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
