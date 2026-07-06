import type { MailContent } from "./mail";
import { labelForISODate } from "./dates";

export type ReservationForEmail = {
  customerName: string;
  email: string;
  phone: string | null;
  note: string | null;
  trainerName: string;
  planName: string;
  planPrice: string;
  planCount: number;
  single: boolean;
  date: string;
  time: string;
  endTime: string;
};

export function buildStoreEmail(storeEmail: string, r: ReservationForEmail): MailContent {
  const dateLabel = labelForISODate(r.date);
  return {
    to: storeEmail,
    subject: `【新規予約】${dateLabel} ${r.time} ${r.trainerName}`,
    lines: [
      `予約者：${r.customerName}`,
      `連絡先：${r.email} / ${r.phone || "（未入力）"}`,
      `コース：${r.planName}`,
      `メニュー：パーソナル90分`,
      `担当：${r.trainerName}`,
      `日時：${dateLabel} ${r.time}〜${r.endTime}`,
      `備考：${r.note || "なし"}`,
    ],
  };
}

export function buildCustomerEmail(r: ReservationForEmail): MailContent {
  const dateLabel = labelForISODate(r.date);
  const planLine = r.single ? `${r.planName}（${r.planPrice}）` : `${r.planName}（残${r.planCount - 1}回）`;
  return {
    to: r.email,
    subject: "ご予約ありがとうございます｜CORE.PT",
    lines: [
      `${r.customerName} 様`,
      "ご予約を承りました。",
      `日時：${dateLabel} ${r.time}〜${r.endTime}`,
      `担当：${r.trainerName}`,
      `コース：${planLine}`,
      "前日18:00にリマインドをお送りします。",
      "ご変更・キャンセルはアプリから承れます。",
    ],
  };
}
