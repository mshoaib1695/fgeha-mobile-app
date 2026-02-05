import React, { createContext, useContext, useState, useCallback } from "react";
import { AppAlert, AppAlertOptions, AppAlertType } from "./AppAlert";

interface AlertState extends AppAlertOptions {
  visible: boolean;
}

interface AlertContextValue {
  showSuccess: (message: string, onPress?: () => void) => void;
  showError: (message: string, title?: string, onPress?: () => void) => void;
  showInfo: (title: string, message: string, onPress?: () => void) => void;
  showAlert: (options: Omit<AppAlertOptions, "onPress"> & { onPress?: () => void }) => void;
}

const defaultTitle: Record<AppAlertType, string> = {
  success: "Done!",
  error: "Please check",
  info: "Notice",
};

const AlertContext = createContext<AlertContextValue | null>(null);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AlertState>({
    visible: false,
    type: "success",
    title: "",
    message: "",
    onPress: () => {},
  });

  const hide = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  const showSuccess = useCallback(
    (message: string, onPress?: () => void) => {
      setState({
        visible: true,
        type: "success",
        title: defaultTitle.success,
        message,
        buttonText: "OK",
        onPress: () => {
          hide();
          onPress?.();
        },
      });
    },
    [hide]
  );

  const showError = useCallback(
    (message: string, title?: string, onPress?: () => void) => {
      setState({
        visible: true,
        type: "error",
        title: title ?? defaultTitle.error,
        message,
        buttonText: "Try again",
        onPress: () => {
          hide();
          onPress?.();
        },
      });
    },
    [hide]
  );

  const showInfo = useCallback(
    (title: string, message: string, onPress?: () => void) => {
      setState({
        visible: true,
        type: "info",
        title,
        message,
        buttonText: "OK",
        onPress: () => {
          hide();
          onPress?.();
        },
      });
    },
    [hide]
  );

  const showAlert = useCallback(
    (options: Omit<AppAlertOptions, "onPress"> & { onPress?: () => void }) => {
      setState({
        visible: true,
        ...options,
        onPress: () => {
          hide();
          options.onPress?.();
        },
      });
    },
    [hide]
  );

  return (
    <AlertContext.Provider value={{ showSuccess, showError, showInfo, showAlert }}>
      {children}
      <AppAlert
        visible={state.visible}
        type={state.type}
        title={state.title}
        message={state.message}
        buttonText={state.buttonText}
        onPress={state.onPress}
      />
    </AlertContext.Provider>
  );
}

export function useAppAlert(): AlertContextValue {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAppAlert must be used within AlertProvider");
  return ctx;
}
