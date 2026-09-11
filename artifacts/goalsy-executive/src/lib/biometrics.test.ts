import { beforeEach, describe, expect, it, vi } from 'vitest';

const native = vi.hoisted(() => ({
  isNativePlatform: vi.fn(),
  checkBiometry: vi.fn(),
  authenticate: vi.fn(),
  getPreference: vi.fn(),
  setPreference: vi.fn(),
  removePreference: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: native.isNativePlatform },
  registerPlugin: () => ({
    checkBiometry: native.checkBiometry,
    authenticate: native.authenticate,
  }),
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: native.getPreference,
    set: native.setPreference,
    remove: native.removePreference,
  },
}));

import {
  authenticateForAppUnlock,
  disableBiometricLock,
  enableBiometricLock,
  getBiometricLockEnabled,
} from './biometrics';

describe('biometric lock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    native.isNativePlatform.mockReturnValue(true);
    native.getPreference.mockResolvedValue({ value: null });
    native.checkBiometry.mockResolvedValue({ isAvailable: true, biometryType: 'faceId' });
    native.authenticate.mockResolvedValue(undefined);
    native.setPreference.mockResolvedValue(undefined);
    native.removePreference.mockResolvedValue(undefined);
  });

  it('enables the device lock only after a successful Face ID confirmation', async () => {
    await expect(enableBiometricLock()).resolves.toBe('Face ID');

    expect(native.authenticate).toHaveBeenCalledWith({
      reason: 'Confirm biometric unlock for Goalsy.',
      cancelTitle: 'Not now',
    });
    expect(native.setPreference).toHaveBeenCalledWith({
      key: 'goalsy_biometric_lock_enabled',
      value: 'true',
    });
  });

  it('does not open a second Face ID prompt when enabling biometrics returns the app to the foreground', async () => {
    await enableBiometricLock();
    await authenticateForAppUnlock();

    expect(native.authenticate).toHaveBeenCalledTimes(1);
  });

  it('does not enable the lock when no enrolled biometric method is available', async () => {
    native.checkBiometry.mockResolvedValue({
      isAvailable: false,
      reason: 'Set up Face ID in Settings first.',
    });

    await expect(enableBiometricLock()).rejects.toThrow('Set up Face ID in Settings first.');
    expect(native.authenticate).not.toHaveBeenCalled();
    expect(native.setPreference).not.toHaveBeenCalled();
  });

  it('keeps biometrics inactive on the web and removes the device setting when disabled', async () => {
    native.isNativePlatform.mockReturnValue(false);
    await expect(getBiometricLockEnabled()).resolves.toBe(false);
    expect(native.getPreference).not.toHaveBeenCalled();

    native.isNativePlatform.mockReturnValue(true);
    await disableBiometricLock();
    expect(native.removePreference).toHaveBeenCalledWith({ key: 'goalsy_biometric_lock_enabled' });
  });
});