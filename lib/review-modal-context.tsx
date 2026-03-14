import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { apiGet, apiPost, unwrapList } from "./api";
import { ReviewModal } from "./ReviewModal";
import {
  isReviewModalDone,
  isReviewModalPending,
  setReviewModalDone,
  setReviewModalPending,
  clearReviewModalPending,
} from "./review-modal-storage";

/** In __DEV__, use 1 so you can test without 5 completed requests. Production uses 5. */
const MIN_COMPLETED_REQUESTS = __DEV__ ? 1 : 5;
const COMPLETED_STATUSES = ["completed", "done"];

interface RequestItem {
  id: number;
  status: string;
}

interface TryShowAfterRequestOptions {
  /** Called when the modal closes (user rated or cancelled). Use to e.g. router.back(). */
  onModalClose?: () => void;
}

interface ReviewModalContextValue {
  /** Call when tabs load - shows modal if eligible and never cancelled. */
  checkAndShowOnSession: () => Promise<void>;
  /** Call after successful request creation. Returns true if modal was shown. */
  tryShowReviewModalAfterRequest: (opts?: TryShowAfterRequestOptions) => Promise<boolean>;
}

const ReviewModalContext = createContext<ReviewModalContextValue | null>(null);

export function useReviewModal(): ReviewModalContextValue {
  const ctx = useContext(ReviewModalContext);
  if (!ctx) throw new Error("useReviewModal must be used within ReviewModalProvider");
  return ctx;
}

export function ReviewModalProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const onCloseAfterRequestRef = useRef<(() => void) | null>(null);

  const countCompletedRequests = useCallback(async (): Promise<number> => {
    try {
      const raw = await apiGet<unknown>("/requests/my");
      const list = unwrapList<RequestItem>(raw);
      return list.filter((r) => COMPLETED_STATUSES.includes(r.status?.toLowerCase() ?? ""))
        .length;
    } catch {
      return 0;
    }
  }, []);

  const isRatingEnabled = useCallback(async (): Promise<boolean> => {
    try {
      const data = await apiGet<{ ratingEnabled?: boolean }>("/app-settings");
      return data?.ratingEnabled !== false;
    } catch {
      return true;
    }
  }, []);

  const checkAndShowOnSession = useCallback(async () => {
    const [done, pending, completedCount, enabled] = await Promise.all([
      isReviewModalDone(),
      isReviewModalPending(),
      countCompletedRequests(),
      isRatingEnabled(),
    ]);
    if (__DEV__) {
      console.log("[ReviewModal] checkAndShowOnSession:", {
        done,
        pending,
        completedCount,
        enabled,
        minRequired: MIN_COMPLETED_REQUESTS,
        willShow: enabled && !done && completedCount >= MIN_COMPLETED_REQUESTS && !pending,
      });
    }
    if (!enabled || done || completedCount < MIN_COMPLETED_REQUESTS) return;
    if (!pending) {
      setVisible(true);
    }
  }, [countCompletedRequests, isRatingEnabled]);

  const tryShowReviewModalAfterRequest = useCallback(
    async (opts?: TryShowAfterRequestOptions): Promise<boolean> => {
      const [done, pending, completedCount, enabled] = await Promise.all([
        isReviewModalDone(),
        isReviewModalPending(),
        countCompletedRequests(),
        isRatingEnabled(),
      ]);
      if (!enabled || done || completedCount < MIN_COMPLETED_REQUESTS) return false;
      if (!pending) return false;
      await clearReviewModalPending();
      onCloseAfterRequestRef.current = opts?.onModalClose ?? null;
      setVisible(true);
      return true;
    },
    [countCompletedRequests, isRatingEnabled]
  );

  const handleRate = useCallback(async () => {
    await setReviewModalDone();
    await clearReviewModalPending();
  }, []);

  const handleCancel = useCallback(async () => {
    await setReviewModalPending();
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    const cb = onCloseAfterRequestRef.current;
    onCloseAfterRequestRef.current = null;
    cb?.();
  }, []);

  const handleLowRatingFeedback = useCallback(async (rating: number, feedback: string) => {
    try {
      await apiPost("/feedback", { rating, feedback: feedback || undefined });
    } catch {
      // Ignore - feedback is optional, don't block the user
    }
  }, []);

  return (
    <ReviewModalContext.Provider value={{ checkAndShowOnSession, tryShowReviewModalAfterRequest }}>
      {children}
      <ReviewModal
        visible={visible}
        onClose={handleClose}
        onRate={handleRate}
        onLowRatingFeedback={handleLowRatingFeedback}
        onCancel={handleCancel}
      />
    </ReviewModalContext.Provider>
  );
}
