"use client";

import { useAndroidBackButton } from "@/lib/use-android-back";

export function AndroidBackHandler() {
  useAndroidBackButton();
  return null;
}
