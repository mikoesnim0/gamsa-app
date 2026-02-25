/**
 * API 추상화 레이어 — 단일 진입점
 *
 * 사용법:
 *   import { api } from "@/lib/api";
 *   const entries = await api.gratitude.getEntries(userId);
 *
 * Phase 전환 시 이 파일의 import만 변경하면 됩니다.
 */

import * as gratitude from "./gratitude";
import * as targets from "./targets";
import * as auth from "./auth";
import * as notifications from "./notifications";
import * as friends from "./friends";
import * as streak from "./streak";
import * as blocked from "./blocked";

export const api = {
  gratitude,
  targets,
  auth,
  notifications,
  friends,
  streak,
  blocked,
} as const;
