import Capacitor
import LocalAuthentication

@objc(BiometricAuthPlugin)
public class BiometricAuthPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BiometricAuthPlugin"
    public let jsName = "BiometricAuth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "checkBiometry", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise)
    ]

    private var hasFaceIDUsageDescription: Bool {
        guard let description = Bundle.main.object(
            forInfoDictionaryKey: "NSFaceIDUsageDescription"
        ) as? String else {
            return false
        }
        return !description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    @objc func checkBiometry(_ call: CAPPluginCall) {
        guard hasFaceIDUsageDescription else {
            call.resolve([
                "isAvailable": false,
                "biometryType": "none",
                "reason": "Face ID is not configured in this app build. Please update Goalsy and try again."
            ])
            return
        }

        let context = LAContext()
        var evaluationError: NSError?
        let isAvailable = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &evaluationError)

        let biometryType: String
        switch context.biometryType {
        case .faceID:
            biometryType = "faceId"
        case .touchID:
            biometryType = "touchId"
        default:
            biometryType = "none"
        }

        call.resolve([
            "isAvailable": isAvailable,
            "biometryType": biometryType,
            "reason": evaluationError?.localizedDescription ?? ""
        ])
    }

    @objc func authenticate(_ call: CAPPluginCall) {
        guard hasFaceIDUsageDescription else {
            call.reject("Face ID is not configured in this app build. Please update Goalsy and try again.")
            return
        }

        let context = LAContext()
        let reason = call.getString("reason") ?? "Unlock your Goalsy account."
        var evaluationError: NSError?

        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &evaluationError) else {
            call.reject(evaluationError?.localizedDescription ?? "Biometric authentication is unavailable.")
            return
        }

        context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) {
            success, error in
            DispatchQueue.main.async {
                if success {
                    call.resolve()
                } else {
                    call.reject(error?.localizedDescription ?? "Biometric authentication was not completed.")
                }
            }
        }
    }
}