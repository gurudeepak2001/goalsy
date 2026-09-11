import { Capacitor, registerPlugin } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const BIOMETRIC_LOCK_KEY = 'goalsy_biometric_lock_enabled';

let biometricAuthenticationPromise: Promise<void> | null = null;

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

  const authentication = BiometricAuth.authenticate(options);
  biometricAuthenticationPromise = authentication;

  try {
    await authentication;
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
  // Presenting Face ID can itself generate inactive/active app-state events.
  // Concurrent foreground callbacks wait for the same in-flight native request.
  // Once that request settles, every later foreground event authenticates again.
  await authenticateWithBiometrics({
    reason: 'Unlock your Goalsy account.',
    cancelTitle: 'Use password',
  });
}