// Must match expo-router/entry so providers wrap the entire app (fixes "useAuth must be used within AuthProvider").
import "@expo/metro-runtime";

import React from "react";
import { resetReviewModalStorage } from "./lib/review-modal-storage";

// In dev, reset review modal storage on app load so you can test the modal again
if (__DEV__) {
  resetReviewModalStorage().catch(() => {});
}
import { SafeAreaProvider } from "react-native-safe-area-context";
import { App } from "expo-router/build/qualified-entry";
import { renderRootComponent } from "expo-router/build/renderRootComponent";
import { FontProvider } from "./lib/FontProvider";
import { AuthProvider } from "./lib/auth-context";
import { AlertProvider } from "./lib/alert-context";
import { ReviewModalProvider } from "./lib/review-modal-context";
import { RootErrorBoundary } from "./lib/error-boundary";

function Root() {
  return (
    <SafeAreaProvider>
      <FontProvider>
        <RootErrorBoundary>
          <AuthProvider>
            <AlertProvider>
              <ReviewModalProvider>
                <App />
              </ReviewModalProvider>
            </AlertProvider>
          </AuthProvider>
        </RootErrorBoundary>
      </FontProvider>
    </SafeAreaProvider>
  );
}

renderRootComponent(Root);
