// Must match expo-router/entry so providers wrap the entire app (fixes "useAuth must be used within AuthProvider").
import "@expo/metro-runtime";

import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { App } from "expo-router/build/qualified-entry";
import { renderRootComponent } from "expo-router/build/renderRootComponent";
import { AuthProvider } from "./lib/auth-context";
import { AlertProvider } from "./lib/alert-context";
import { RootErrorBoundary } from "./lib/error-boundary";
import { ForceUpdateGate } from "./lib/force-update";

function Root() {
  return (
    <SafeAreaProvider>
      <RootErrorBoundary>
        <AuthProvider>
          <AlertProvider>
            <ForceUpdateGate>
              <App />
            </ForceUpdateGate>
          </AlertProvider>
        </AuthProvider>
      </RootErrorBoundary>
    </SafeAreaProvider>
  );
}

renderRootComponent(Root);
