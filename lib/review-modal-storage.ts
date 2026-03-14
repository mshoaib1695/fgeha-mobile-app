import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_DONE = "review_modal_done";
const KEY_PENDING = "review_modal_pending";

/** User has rated (either high or low) - never show again. */
export async function isReviewModalDone(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEY_DONE);
  return v === "1";
}

/** User cancelled without rating - show again only after next successful request. */
export async function isReviewModalPending(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEY_PENDING);
  return v === "1";
}

export async function setReviewModalDone(): Promise<void> {
  await AsyncStorage.setItem(KEY_DONE, "1");
}

export async function setReviewModalPending(): Promise<void> {
  await AsyncStorage.setItem(KEY_PENDING, "1");
}

export async function clearReviewModalPending(): Promise<void> {
  await AsyncStorage.removeItem(KEY_PENDING);
}

/** Reset all review modal state - for testing. Clears done and pending. */
export async function resetReviewModalStorage(): Promise<void> {
  await AsyncStorage.multiRemove([KEY_DONE, KEY_PENDING]);
}
