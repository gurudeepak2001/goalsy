package com.enteraxion.goalsy;

import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.PluginMethod;

import java.util.concurrent.Executor;

@CapacitorPlugin(name = "BiometricAuth")
public class BiometricAuthPlugin extends Plugin {
    private static final int AUTHENTICATORS = BiometricManager.Authenticators.BIOMETRIC_STRONG;

    @PluginMethod
    public void checkBiometry(PluginCall call) {
        BiometricManager manager = BiometricManager.from(getContext());
        int result = manager.canAuthenticate(AUTHENTICATORS);

        JSObject response = new JSObject();
        response.put("isAvailable", result == BiometricManager.BIOMETRIC_SUCCESS);
        response.put("biometryType", "biometric");
        response.put("reason", availabilityReason(result));
        call.resolve(response);
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        BiometricManager manager = BiometricManager.from(getContext());
        int available = manager.canAuthenticate(AUTHENTICATORS);
        if (available != BiometricManager.BIOMETRIC_SUCCESS) {
            call.reject(availabilityReason(available));
            return;
        }

        if (!(getActivity() instanceof FragmentActivity)) {
            call.reject("Biometric authentication is unavailable because the app activity is not ready.");
            return;
        }

        Executor executor = ContextCompat.getMainExecutor(getContext());
        BiometricPrompt prompt = new BiometricPrompt((FragmentActivity) getActivity(), executor,
            new BiometricPrompt.AuthenticationCallback() {
                @Override
                public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                    super.onAuthenticationSucceeded(result);
                    call.resolve();
                }

                @Override
                public void onAuthenticationError(int errorCode, @NonNull CharSequence errorMessage) {
                    super.onAuthenticationError(errorCode, errorMessage);
                    call.reject(errorMessage.toString());
                }
            });

        BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
            .setTitle("Unlock Goalsy")
            .setSubtitle(call.getString("reason", "Unlock your Goalsy account."))
            .setNegativeButtonText(call.getString("cancelTitle", "Cancel"))
            .setAllowedAuthenticators(AUTHENTICATORS)
            .build();

        prompt.authenticate(promptInfo);
    }

    private String availabilityReason(int result) {
        switch (result) {
            case BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED:
                return "Set up Face Unlock or fingerprint recognition in your device settings first.";
            case BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE:
                return "This device does not support app biometric authentication.";
            case BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE:
                return "Biometric authentication is temporarily unavailable.";
            default:
                return "No enrolled biometric method is available on this device.";
        }
    }
}