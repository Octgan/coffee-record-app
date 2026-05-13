const STORAGE_PREFIX = "coffee-record-onboarding-tutorial";

export function onboardingTutorialStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function isOnboardingTutorialDone(userId: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(onboardingTutorialStorageKey(userId)) === "1";
}

export function setOnboardingTutorialDone(userId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(onboardingTutorialStorageKey(userId), "1");
}
