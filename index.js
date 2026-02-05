// Must match expo-router/entry so providers wrap the entire app (fixes "useAuth must be used within AuthProvider").
import "@expo/metro-runtime";

import React from "react";
import { App } from "expo-router/build/qualified-entry";
import { renderRootComponent } from "expo-router/build/renderRootComponent";
import { AuthProvider } from "./lib/auth-context";
import { AlertProvider } from "./lib/alert-context";
import { RootErrorBoundary } from "./lib/error-boundary";

function Root() {
  return (
    <RootErrorBoundary>
      <AuthProvider>
        <AlertProvider>
          <App />
        </AlertProvider>
      </AuthProvider>
    </RootErrorBoundary>
  );
}

renderRootComponent(Root);
