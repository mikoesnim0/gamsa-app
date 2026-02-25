# i18n 아키텍처 연구

> from/frontend의 다국어 지원 분석 + gamsa-app 적용 방안

## 1. from/frontend 현재 구현

### 1.1 파일 구조

- **단일 파일**: `from/frontend/app/lib/i18n.ts` (1,926줄)
- 별도 JSON/YAML 번역 파일 없음 — 모든 번역이 TypeScript 파일에 인라인

### 1.2 지원 언어 (10개)

| 코드 | 언어명 | 번역 완성도 |
|------|--------|------------|
| `ko` | 한국어 | 211/211 (100%) |
| `en` | English | 211/211 (100%, 기본) |
| `ja` | 日本語 | 172/211 (81%) |
| `zh` | 简体中文 | 172/211 (81%) |
| `es` | Español | 172/211 (81%) |
| `pt` | Português | 172/211 (81%) |
| `fr` | Français | 172/211 (81%) |
| `de` | Deutsch | 172/211 (81%) |
| `ar` | العربية | 172/211 (81%) |
| `hi` | हिन्दी | 172/211 (81%) |

### 1.3 번역 패턴

**Flat key-value dictionary** — 중첩 없음, 언더스코어 구분자:

```typescript
const EN: Record<string, string> = {
  home: "Home",
  record: "Record",
  today_record: "Today's Record",
  write_letter: "Write Letter",
  emotion_filter: "Emotion Filter",
  // ... 211개 키
};

const KO: Record<string, string> = {
  home: "홈",
  record: "기록",
  today_record: "오늘의 기록",
  write_letter: "감사 쓰기",
  // ...
};
```

각 언어는 EN을 스프레드하여 폴백:

```typescript
const DICT: Record<LangCode, Record<string, string>> = {
  en: EN,
  ko: { ...EN, ...KO },  // KO 키가 EN 키를 오버라이드
  ja: { ...EN, ...JA },
  // ...
};
```

### 1.4 t() 함수

```typescript
export function t(
  lang: string | null | undefined,
  key: string,
  vars?: Record<string, string | number>
): string {
  const code = coerceLanguage(lang);
  const message = DICT[code]?.[key] ?? EN[key] ?? key;
  if (!vars) return message;
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
    message
  );
}
```

**폴백 체인**: 선택 언어 → English → 키 이름 그대로 반환

### 1.5 변수 보간 (Interpolation)

`{변수명}` 패턴으로 런타임 치환:

```typescript
// 정의
letters_this_week: "{count} letters this week."

// 사용
t("ko", "letters_this_week", { count: 5 })
// → "이번 주 5개의 감사"
```

사용되는 변수: `{count}`, `{name}`, `{peak}` 등 2~3개

### 1.6 언어 설정 저장

- **저장소**: `localStorage`
- **키**: `me:prefs:${viewerUid}`
- **형식**: JSON 객체 내 `language` 필드
- **URL 파라미터**: `?lang=ko` 로도 전달 가능

### 1.7 언어 코드 강제 변환 (coerceLanguage)

다양한 입력을 표준 코드로 변환:

```typescript
coerceLanguage("korean")  // → "ko"
coerceLanguage("한국어")   // → "ko"
coerceLanguage("en")      // → "en"
coerceLanguage("")         // → "ko" (기본값)
```

### 1.8 미구현 기능

- **복수형(Pluralization)**: 미지원 — `{count}개` 처럼 직접 처리
- **RTL 지원**: 아랍어 포함이나 CSS direction 미처리
- **날짜/숫자 포맷팅**: i18n 레이어에 포함 안됨

---

## 2. gamsa-app 적용 방안

### 2.1 옵션 비교

| 방안 | 장점 | 단점 |
|------|------|------|
| **A. next-intl** | Next.js 공식 추천, App Router 지원, 정적 최적화 | 설정 복잡, 라우팅 변경 필요 (`/ko/home`) |
| **B. 자체 t() 함수** (from 방식) | 단순, 라우팅 변경 없음, from 코드 재활용 가능 | SEO 불리, 번들 크기 증가 |
| **C. react-i18next** | 생태계 풍부, 복수형/포맷팅 내장 | 설정 복잡, SSR 까다로움 |

### 2.2 추천: Phase별 접근

#### Phase 1 (현재) — 한국어 하드코딩 유지

- 현재 모든 텍스트가 JSX에 한국어로 직접 입력됨
- 사용자 베이스가 한국어권이므로 즉시 다국어 불필요
- **변경 없음**

#### Phase 2 — 자체 t() 함수 도입

from의 패턴을 채택하되 개선:

```typescript
// src/lib/i18n/index.ts
import ko from "./ko.json";
import en from "./en.json";

const DICT = { ko, en };

export function t(key: string, vars?: Record<string, string | number>): string {
  const lang = useLanguageStore.getState().lang; // zustand or context
  const msg = DICT[lang]?.[key] ?? DICT.ko[key] ?? key;
  if (!vars) return msg;
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
    msg
  );
}
```

**개선점**:
1. 번역을 별도 JSON 파일로 분리 (유지보수 용이)
2. React Context 또는 Zustand로 언어 상태 관리
3. 기본 언어 = `ko` (from과 동일)

#### Phase 3 — next-intl 마이그레이션 (선택)

사용자가 10개 언어 모두 필요할 때:
- `next-intl` 도입
- `/[locale]/` 라우팅
- 정적 생성 + SEO 최적화

### 2.3 키 네이밍 컨벤션

from의 211개 키를 참고하여 컨벤션 수립:

```
page_section_element

예시:
home_today_record        → "오늘의 기록"
home_weekly_summary      → "주간 요약"
write_emotion_label      → "지금 감정은 어떤가요?"
write_submit             → "감사 보내기"
profile_notification     → "알림 설정"
friends_invite_code      → "초대 코드"
records_sent_tab         → "보낸 감사"
records_received_tab     → "받은 감사"
common_cancel            → "취소"
common_confirm           → "확인"
common_loading           → "로딩 중..."
```

### 2.4 예상 키 수

gamsa-app 현재 하드코딩된 한국어 텍스트 기준:
- Home: ~15개
- Write: ~25개
- Records: ~20개
- Profile: ~30개
- Friends: ~15개
- Common (버튼, 에러 등): ~20개
- **총 예상: ~125개**

---

## 3. 마이그레이션 체크리스트

Phase 2 전환 시:

- [ ] `src/lib/i18n/` 디렉토리 생성
- [ ] `ko.json`, `en.json` 번역 파일 작성
- [ ] `t()` 함수 및 `useLanguage` 훅 구현
- [ ] LanguageProvider 컴포넌트 생성 (Context)
- [ ] 언어 설정 UI (Profile 페이지에 이미 드롭다운 자리 있음)
- [ ] 모든 페이지의 하드코딩 텍스트를 `t("key")` 로 교체
- [ ] from의 211개 키 중 gamsa-app에 해당하는 키 매핑
- [ ] 추가 언어 번역 (en 우선, 이후 ja, zh 순)

---

## 참조

- from/frontend i18n 소스: `from/frontend/app/lib/i18n.ts`
- Next.js i18n 공식 문서: https://nextjs.org/docs/app/building-your-application/routing/internationalization
- next-intl: https://next-intl.dev/
