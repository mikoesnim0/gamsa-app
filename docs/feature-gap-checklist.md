# 기능 갭 체크리스트

> from/frontend에서 구현되었으나 gamsa-app에서 미구현인 기능 정리
>
> 마지막 업데이트: 2026-02-25

---

## 1. 인증 & 사용자

- [ ] 1.1 Google 계정 연동 (from: account linking UI)
- [ ] 1.2 FCM 푸시 토큰 관리
  - [ ] 1.2.1 토큰 등록 (`Notification.requestPermission` + `getToken`)
  - [ ] 1.2.2 토큰 갱신 (`onMessage` 리스너)
  - [ ] 1.2.3 Firestore `users/{uid}` 에 `fcmToken` 필드 저장
- [ ] 1.3 프로필 아바타 이미지 업로드
  - [ ] 1.3.1 Firebase Storage 버킷 설정
  - [ ] 1.3.2 이미지 리사이즈 (클라이언트 또는 Cloud Function)
  - [ ] 1.3.3 `avatarUrl` 필드 업데이트
- [x] 1.4 알림 설정 (새 편지/마케팅/리마인더) — UI + API 구현 완료
- [x] 1.5 차단 목록 CRUD — UI + API 구현 완료

## 2. 편지 (감사 기록)

- [ ] 2.1 예약 전달 실제 실행
  - [ ] 2.1.1 Cloud Function: 스케줄러 (매 시간 체크)
  - [ ] 2.1.2 `deliveryOption === "scheduled"` 인 편지 필터
  - [ ] 2.1.3 예약 시간 도달 시 → 알림 전송 + `isDelivered: true` 업데이트
- [ ] 2.2 편지 반응 (reactions)
  - [ ] 2.2.1 Firestore subcollection: `entries/{entryId}/reactions`
  - [ ] 2.2.2 from에서 지원하는 반응: 하트, 고마워, 감동
  - [ ] 2.2.3 반응 UI (받은 편지 하단)
- [ ] 2.3 편지 공유
  - [ ] 2.3.1 `share_id` 생성 (UUID 또는 nanoid)
  - [ ] 2.3.2 공유 가능한 공개 URL (`/shared/{share_id}`)
  - [ ] 2.3.3 Canvas 기반 이미지 생성 (카드 형태)
  - [ ] 2.3.4 Web Share API 연동 (`navigator.share`)
  - [ ] 2.3.5 바텀시트 UI (공유 옵션: 링크 복사, 이미지 저장, 카카오톡)
- [ ] 2.4 받은 편지 쿼리 (cross-user)
  - [ ] 2.4.1 `received_letters` top-level 컬렉션 설계
  - [ ] 2.4.2 Cloud Function: 편지 생성 시 → `received_letters`에 복사
  - [ ] 2.4.3 `getReceivedEntries(userId)` API 실제 구현
  - [ ] 2.4.4 Home 페이지 `receivedCount` 실제 연동
- [x] 2.5 편지 상세 보기 페이지 (`/records/[id]`) — 구현 완료

## 3. 소셜

- [ ] 3.1 일일 좋아요 시스템
  - [ ] 3.1.1 Firestore: `users/{uid}/dailyLikes/{date}` (일일 제한)
  - [ ] 3.1.2 친구 카드에서 좋아요 버튼 → API 호출
  - [ ] 3.1.3 좋아요 수 표시 (친구 카드 미니 통계)
- [ ] 3.2 친구 프로필 hydration
  - [ ] 3.2.1 `getFriends` 후 각 `friendUserId`로 프로필 조회
  - [ ] 3.2.2 또는 Friend 문서에 프로필 스냅샷 denormalization
  - [ ] 3.2.3 실시간 동기화 (Cloud Function 트리거)
- [ ] 3.3 QR 초대 카드 다운로드
  - [ ] 3.3.1 Canvas API로 1080x1440 이미지 생성
  - [ ] 3.3.2 QR 코드 + 닉네임 + 브랜딩 포함
  - [ ] 3.3.3 다운로드 버튼 (Blob → download link)
- [x] 3.4 친구 검색 필터 — 구현 완료
- [x] 3.5 초대 코드 복사 + QR 모달 — 구현 완료

## 4. 알림

- [ ] 4.1 알림 설정 Firestore persistence
  - [ ] 4.1.1 `updateNotificationSettings` API 구현됨 (UI 연결 완료)
  - [ ] 4.1.2 실제 Firestore 저장 검증 필요 (Firebase 프로젝트 연결 후)
- [ ] 4.2 일일 리마인더
  - [ ] 4.2.1 Cloud Function: 매 30분마다 실행
  - [ ] 4.2.2 `dailyReminderTime` 매칭 사용자 필터
  - [ ] 4.2.3 `deliveryOptIn === true` 조건
  - [ ] 4.2.4 FCM 메시지 전송
- [ ] 4.3 푸시 알림 수신 처리
  - [ ] 4.3.1 Service Worker 등록
  - [ ] 4.3.2 포그라운드 알림 (토스트)
  - [ ] 4.3.3 백그라운드 알림 (시스템 노티)

## 5. 국제화 (i18n)

- [ ] 5.1 다국어 지원
  - [ ] 5.1.1 `t()` 함수 또는 next-intl 도입 (→ `docs/i18n-architecture.md` 참조)
  - [ ] 5.1.2 한국어 키 추출 (~125개 예상)
  - [ ] 5.1.3 영어 번역
  - [ ] 5.1.4 추가 언어 (ja, zh, es, pt, fr, de, ar, hi)
  - [ ] 5.1.5 언어 선택 UI (Profile 페이지 드롭다운)

## 6. 보안

- [ ] 6.1 신고 기능
  - [ ] 6.1.1 Firestore `reports` top-level 컬렉션
  - [ ] 6.1.2 신고 사유 선택 UI (부적절한 내용, 스팸, 괴롭힘 등)
  - [ ] 6.1.3 관리자 대시보드 (별도 프로젝트)
- [ ] 6.2 Firestore Security Rules
  - [ ] 6.2.1 사용자별 데이터 격리 (own subcollection만 접근)
  - [ ] 6.2.2 친구 관계 검증 (편지 전달 시)
  - [ ] 6.2.3 차단 사용자 필터링
- [x] 6.3 차단 목록 UI + API — 구현 완료

## 7. 결제 & 프리미엄

- [ ] 7.1 감사 페이지 (990원)
  - [ ] 7.1.1 결제 연동 (토스페이먼츠 or 인앱결제)
  - [ ] 7.1.2 감사 페이지 생성 UI (`/gratitude-page/create`)
  - [ ] 7.1.3 공개 감사 페이지 렌더링 (`/gratitude-page/[id]`)
- [ ] 7.2 결산 리포트 (4,990원)
  - [ ] 7.2.1 연간 감사 분석 (감정 트렌드, 대상별 통계)
  - [ ] 7.2.2 PDF/이미지 생성
  - [ ] 7.2.3 결제 후 다운로드

## 8. UI/UX 고도화

- [ ] 8.1 다크 모드 완성도
  - [ ] 8.1.1 모든 컴포넌트 dark: 클래스 검증
  - [ ] 8.1.2 이미지/아이콘 다크모드 대응
  - [ ] 8.1.3 시스템 테마 자동 감지
- [ ] 8.2 PWA 설정
  - [ ] 8.2.1 `manifest.json` (아이콘, 테마 컬러, 스플래시)
  - [ ] 8.2.2 Service Worker (오프라인 캐시)
  - [ ] 8.2.3 "홈 화면에 추가" 프롬프트
- [ ] 8.3 애니메이션/트랜지션
  - [ ] 8.3.1 페이지 전환 애니메이션
  - [ ] 8.3.2 리스트 아이템 진입 애니메이션
  - [ ] 8.3.3 감정 선택 시 마이크로 인터랙션
- [ ] 8.4 스켈레톤 로딩 UI
  - [ ] 8.4.1 Home 페이지 스켈레톤
  - [ ] 8.4.2 Records 리스트 스켈레톤
  - [ ] 8.4.3 Friends 리스트 스켈레톤

## 9. 인프라 & DevOps

- [ ] 9.1 Firebase 프로젝트 설정
  - [ ] 9.1.1 `.env.local` 환경변수
  - [ ] 9.1.2 Firestore 인덱스 설정
  - [ ] 9.1.3 Firebase Hosting 또는 Vercel 배포
- [ ] 9.2 CI/CD 파이프라인
  - [ ] 9.2.1 GitHub Actions: lint + type-check + build
  - [ ] 9.2.2 Preview deployments (PR별)
  - [ ] 9.2.3 Production 자동 배포 (main 머지 시)
- [ ] 9.3 모니터링
  - [ ] 9.3.1 에러 트래킹 (Sentry)
  - [ ] 9.3.2 성능 모니터링 (Firebase Performance)
  - [ ] 9.3.3 사용자 분석 (Firebase Analytics)

---

## 요약

| 카테고리 | 전체 | 완료 | 미구현 |
|----------|------|------|--------|
| 인증 & 사용자 | 5 | 2 | 3 |
| 편지 | 5 | 1 | 4 |
| 소셜 | 5 | 2 | 3 |
| 알림 | 3 | 0 | 3 |
| 국제화 | 1 | 0 | 1 |
| 보안 | 3 | 1 | 2 |
| 결제 | 2 | 0 | 2 |
| UI/UX | 4 | 0 | 4 |
| 인프라 | 3 | 0 | 3 |
| **합계** | **31** | **6** | **25** |
