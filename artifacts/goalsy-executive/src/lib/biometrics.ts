import { Capacitor, registerPlugin } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const BIOMETRIC_LOCK_KEY = 'goalsy_biometric_lock_enabled';
const BIOMETRIC_PROMPT_LIFECYCLE_SETTLE_MS = 2_000;

let biometricAuthenticationPromise: Promise<void> | null = null;
let suppressBiometricAuthenticationUntil = 0;

interface BiometricAuthPlugin {
  checkBiometry(): Promise<{
    isAvailable: boolean;
    biometryType?: 'faceId' | 'touchId' | 'fingerprint' | 'face' | 'iris' | 'none';
    reason?: string;
  }>;
  authenticate(options: { reason: string; cancelTitle?: string }): Promise<void>;
}

const BiometricAuth = registerPlugin<BiometricAuthPlugin>('BiometricAuth');

async function authenticateWithBiometrics(options: {
  reason: string;
  cancelTitle?: string;
}): Promise<void> {
  if (biometricAuthenticationPromise) {
    return biometricAuthenticationPromise;
  }
  if (Date.now() < suppressBiometricAuthenticationUntil) {
    return;
  }

  const authentication = BiometricAuth.authenticate(options);
  biometricAuthenticationPromise = authentication;

  try {
    await authentication;
    // iOS can report the app active again shortly after Face ID succeeds.
    // Keep that prompt-generated lifecycle callback from starting a second
    // request after the in-flight promise has already settled.
    suppressBiometricAuthenticationUntil =
      Date.now() + BIOMETRIC_PROMPT_LIFECYCLE_SETTLE_MS;
  } finally {
    if (biometricAuthenticationPromise === authentication) {
      biometricAuthenticationPromise = null;
    }
  }
}

export function isNativeBiometricDevice(): boolean {
  return Capacitor.isNativePlatform();
}

export async function getBiometricLockEnabled(): Promise<boolean> {
  if (!isNativeBiometricDevice()) return false;
  const { value } = await Preferences.get({ key: BIOMETRIC_LOCK_KEY });
  return value === 'true';
}

export async function enableBiometricLock(): Promise<string> {
  if (!isNativeBiometricDevice()) {
    throw new Error('Face ID and Touch ID are available in the Goalsy mobile app.');
  }

  const availability = await BiometricAuth.checkBiometry();
  if (!availability.isAvailable) {
    throw new Error(availability.reason || 'No enrolled biometric method is available on this device.');
  }

  await authenticateWithBiometrics({
    reason: 'Confirm biometric unlock for Goalsy.',
    cancelTitle: 'Not now',
  });
  await Preferences.set({ key: BIOMETRIC_LOCK_KEY, value: 'true' });

  return availability.biometryType === 'faceId' ? 'Face ID' : 'device biometrics';
}

export async function disableBiometricLock(): Promise<void> {
  if (!isNativeBiometricDevice()) return;
  await Preferences.remove({ key: BIOMETRIC_LOCK_KEY });
}

export async function authenticateForAppUnlock(): Promise<void> {
  const availability = await BiometricAuth.checkBiometry();
  if (!availability.isAvailable) {
    throw new Error(availability.reason || 'No enrolled biometric method is available on this device.');
  }

  // Presenting Face ID can itself generate inactive/active app-state events.
  // Concurrent callbacks share the request, and the delayed active callback
  // emitted shortly after success is suppressed while iOS settles.
  await authenticateWithBiometrics({
    reason: 'Unlock your Goalsy account.',
    cancelTitle: 'Use password',
  });
}

export function resetBiometricAuthenticationStateForTesting(): void {
  if (!import.meta.env.DEV) return;
  biometricAuthenticationPromise = null;
  suppressBiometricAuthenticationUntil = 0;
}