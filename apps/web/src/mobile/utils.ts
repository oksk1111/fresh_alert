/** 모바일 화면 공용 포맷 유틸. */

const WON = new Intl.NumberFormat("ko-KR");

/** 원화 표기: 3200 → "3,200원" */
export function formatWon(value: number): string {
  return `${WON.format(Math.round(value))}원`;
}

/** 하락률 표기: -12.53 → "12.5%" (절대값) */
export function formatDropRate(rate: number): string {
  return `${Math.abs(rate).toFixed(1)}%`;
}

const DAY_LABEL: Record<string, string> = {
  MON: "월",
  TUE: "화",
  WED: "수",
  THU: "목",
  FRI: "금",
  SAT: "토",
  SUN: "일",
};

/** 알림 요일 표기: ["MON","THU"] → "월·목" */
export function formatNotifyDays(days: string[]): string {
  if (!days.length) return "매일";
  return days.map((d) => DAY_LABEL[d] ?? d).join("·");
}

/** 상대 시간 표기: ISO → "3분 전" */
export function formatRelTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}
