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

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

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

  it('keeps concurrent unlock requests pending until the shared authentication fails', async () => {
    const authentication = deferred<void>();
    native.authenticate.mockReturnValueOnce(authentication.promise);

    const firstUnlock = authenticateForAppUnlock();
    const secondUnlock = authenticateForAppUnlock();
    let secondSettled = false;
    void secondUnlock.then(
      () => {
        secondSettled = true;
      },
      () => {
        secondSettled = true;
      },
    );

    await Promise.resolve();
    expect(native.authenticate).toHaveBeenCalledTimes(1);
    expect(secondSettled).toBe(false);

    authentication.reject(new Error('Biometric authentication cancelled'));
    await expect(firstUnlock).rejects.toThrow('Biometric authentication cancelled');
    await expect(secondUnlock).rejects.toThrow('Biometric authentication cancelled');
  });

  it('keeps concurrent unlock requests pending until the shared authentication succeeds', async () => {
    const authentication = deferred<void>();
    native.authenticate.mockReturnValueOnce(authentication.promise);

    const firstUnlock = authenticateForAppUnlock();
    const secondUnlock = authenticateForAppUnlock();
    let secondSettled = false;
    void secondUnlock.then(() => {
      secondSettled = true;
    });

    await Promise.resolve();
    expect(native.authenticate).toHaveBeenCalledTimes(1);
    expect(secondSettled).toBe(false);

    authentication.resolve();
    await expect(Promise.all([firstUnlock, secondUnlock])).resolves.toEqual([undefined, undefined]);
    expect(secondSettled).toBe(true);
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

  it('shares the in-flight Face ID prompt when enabling biometrics triggers a foreground callback', async () => {
    const authentication = deferred<void>();
    native.authenticate.mockReturnValueOnce(authentication.promise);

    const enable = enableBiometricLock();
    await Promise.resolve();
    const foregroundUnlock = authenticateForAppUnlock();
    expect(native.authenticate).toHaveBeenCalledTimes(1);

    authentication.resolve();
    await expect(enable).resolves.toBe('Face ID');
    await expect(foregroundUnlock).resolves.toBeUndefined();
  });

  it('requires a new authentication for a genuine foreground event after success', async () => {
    await authenticateForAppUnlock();
    await authenticateForAppUnlock();

    expect(native.checkBiometry).toHaveBeenCalledTimes(2);
    expect(native.authenticate).toHaveBeenCalledTimes(2);
  });

  it('handles the native availability result before requesting app unlock', async () => {
    native.checkBiometry.mockResolvedValue({
      isAvailable: false,
      biometryType: 'faceId',
      reason: 'Biometry is not enrolled.',
    });

    await expect(authenticateForAppUnlock()).rejects.toThrow('Biometry is not enrolled.');
    expect(native.checkBiometry).toHaveBeenCalledTimes(1);
    expect(native.authenticate).not.toHaveBeenCalled();
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