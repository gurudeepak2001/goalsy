import { Capacitor, registerPlugin } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const BIOMETRIC_LOCK_KEY = 'goalsy_biometric_lock_enabled';
const BIOMETRIC_AUTH_GRACE_MS = 5_000;

let biometricAuthenticationInProgress = false;
let lastSuccessfulBiometricAuthenticationAt = 0;

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
  biometricAuthenticationInProgress = true;
  try {
    await BiometricAuth.authenticate(options);
    lastSuccessfulBiometricAuthenticationAt = Date.now();
  } finally {
    biometricAuthenticationInProgress = false;
  }
}

function canReuseCurrentBiometricAuthentication(): boolean {
  return biometricAuthenticationInProgress
    || Date.now() - lastSuccessfulBiometricAuthenticationAt < BIOMETRIC_AUTH_GRACE_MS;
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
  // Reuse the authentication already in progress (or just completed) instead
  // of opening a second prompt when the foreground listener runs.
  if (canReuseCurrentBiometricAuthentication()) return;

  await authenticateWithBiometrics({
    reason: 'Unlock your Goalsy account.',
    cancelTitle: 'Use password',
  });
}