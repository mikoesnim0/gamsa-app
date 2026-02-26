/**
 * 연락처 접근 추상화 레이어
 *
 * 네이티브 (Capacitor): @capacitor-community/contacts 플러그인
 * 웹 폴백: Contact Picker API (Chrome Android)
 * 미지원 환경: null 반환
 */

export interface ContactResult {
  name: string;
  phones: string[];
}

/** Capacitor 네이티브 환경인지 감지 */
function isCapacitor(): boolean {
  return (
    typeof window !== "undefined" &&
    (window as unknown as Record<string, unknown>).Capacitor !== undefined
  );
}

/** Contact Picker API (웹) 지원 여부 */
function hasContactPickerAPI(): boolean {
  return typeof navigator !== "undefined" && "contacts" in navigator;
}

/** 연락처 접근 가능 여부 */
export function isContactsSupported(): boolean {
  return isCapacitor() || hasContactPickerAPI();
}

/**
 * 연락처에서 연락처 목록을 가져옴
 *
 * - Capacitor: 전체 연락처 접근 (권한 요청 포함)
 * - Web: Contact Picker API (사용자가 직접 선택)
 * - 미지원: null 반환
 */
export async function pickContacts(
  options: { multiple?: boolean } = {}
): Promise<ContactResult[] | null> {
  const multiple = options.multiple ?? true;

  // 1. Capacitor 네이티브
  if (isCapacitor()) {
    try {
      const { Contacts } = await import("@capacitor-community/contacts");

      // 권한 요청
      const permission = await Contacts.requestPermissions();
      if (permission.contacts !== "granted") {
        return null;
      }

      const result = await Contacts.getContacts({
        projection: {
          name: true,
          phones: true,
        },
      });

      return (result.contacts ?? [])
        .filter((c) => c.name?.display && c.phones?.length)
        .map((c) => ({
          name: c.name!.display!,
          phones: c.phones!.map((p) => p.number!).filter(Boolean),
        }));
    } catch {
      return null;
    }
  }

  // 2. Contact Picker API (웹 폴백)
  if (hasContactPickerAPI()) {
    try {
      const nav = navigator as unknown as {
        contacts: {
          select: (
            props: string[],
            opts: { multiple: boolean }
          ) => Promise<Array<{ name: string[]; tel: string[] }>>;
        };
      };

      const contacts = await nav.contacts.select(["name", "tel"], {
        multiple,
      });

      return contacts
        .filter((c) => c.name?.[0] && c.tel?.length)
        .map((c) => ({
          name: c.name[0],
          phones: c.tel.filter(Boolean),
        }));
    } catch {
      return null;
    }
  }

  // 3. 미지원
  return null;
}

/**
 * 연락처에서 단일 연락처를 선택 (감사 대상 등록용)
 */
export async function pickSingleContact(): Promise<ContactResult | null> {
  const results = await pickContacts({ multiple: false });
  return results?.[0] ?? null;
}
