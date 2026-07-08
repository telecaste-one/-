"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { buildAvailabilityGrid } from "@/lib/slotGrid";
import { PLANS } from "@/lib/plans";
import { DATE_PAGE_SIZE } from "@/lib/constants";
import { weekdayColor, dateChipStyle, ACCENT } from "@/lib/theme";
import type { SlotsResponse, ReservationDTO, CreateReservationResponse, MailPreview } from "@/lib/types";

const STORAGE_KEY = "core_pt_reservation_id";
const POLL_MS = 6000;

type FormState = { name: string; email: string; phone: string; note: string };

export default function BookingApp() {
  const [slots, setSlots] = useState<SlotsResponse | null>(null);
  const [planIdx, setPlanIdx] = useState(2);
  const [pageOffset, setPageOffset] = useState(0); // days from today; pages the date picker through the store's booking window
  const [dateIdx, setDateIdx] = useState(0);
  const [timeIdxSel, setTimeIdxSel] = useState<number | null>(null); // explicit pick; falls back to the first bookable time when unset/stale
  const [staffIdSel, setStaffIdSel] = useState<string | null>(null); // explicit pick; falls back to 指名なし when unset/stale
  const [activeRes, setActiveRes] = useState<ReservationDTO | null>(null);
  const [activeChecked, setActiveChecked] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>({ name: "", email: "", phone: "", note: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [done, setDone] = useState<CreateReservationResponse | null>(null);
  const [showStoreMail, setShowStoreMail] = useState(false);
  const [showCustMail, setShowCustMail] = useState(false);

  const fetchSlots = useCallback(async (offset: number) => {
    const res = await fetch(`/api/public/slots?offset=${offset}`, { cache: "no-store" });
    if (res.ok) setSlots(await res.json());
  }, []);

  const checkActiveReservation = useCallback(async () => {
    const id = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!id) {
      setActiveChecked(true);
      return;
    }
    const res = await fetch(`/api/public/reservations/${id}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.reservation.status === "active") {
        setActiveRes(data.reservation);
      } else {
        localStorage.removeItem(STORAGE_KEY);
        setActiveRes(null);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setActiveChecked(true);
  }, []);

  useEffect(() => {
    // Initial + polled data load from the server. setState happens inside
    // these async functions after a fetch resolves (a subscription-style
    // sync with server state), not synchronously during this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSlots(pageOffset);
    checkActiveReservation();
    const iv = setInterval(() => {
      fetchSlots(pageOffset);
      checkActiveReservation();
    }, POLL_MS);
    const onFocus = () => {
      fetchSlots(pageOffset);
      checkActiveReservation();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(iv);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchSlots, checkActiveReservation, pageOffset]);

  function pickPage(offset: number) {
    setPageOffset(Math.max(0, offset));
    setDateIdx(0);
  }

  const grid = useMemo(() => (slots ? buildAvailabilityGrid(slots.overrides, slots.booked) : null), [slots]);
  const trainers = useMemo(() => slots?.trainers ?? [], [slots]);
  const dates = useMemo(() => slots?.dates ?? [], [slots]);
  const times = useMemo(() => slots?.times ?? [], [slots]);

  const timeSlotBookable = useCallback(
    (dIdx: number, tIdx: number) => {
      if (!grid || !dates[dIdx] || !times[tIdx]) return false;
      return trainers.some((t) => grid.isBookable(t.id, dates[dIdx].date, times[tIdx]));
    },
    [grid, dates, times, trainers]
  );

  // First bookable time for the current date — used whenever there's no
  // (still-valid) explicit pick. Derived at render time rather than synced
  // via effect, so a stale pick falls back automatically with no extra state.
  const defaultTimeIdx = useMemo(() => {
    if (!grid) return null;
    for (let t = 0; t < times.length; t++) if (timeSlotBookable(dateIdx, t)) return t;
    return null;
  }, [grid, dateIdx, times, timeSlotBookable]);

  const timeIdx = timeIdxSel !== null && timeSlotBookable(dateIdx, timeIdxSel) ? timeIdxSel : defaultTimeIdx;

  const plan = PLANS[planIdx];
  const date = dates[dateIdx];
  const time = timeIdx != null ? times[timeIdx] : undefined;

  const slotBookable = date && time ? timeSlotBookable(dateIdx, timeIdx!) : false;

  // Falls back to 指名なし (auto-assign) if the explicitly picked trainer is
  // no longer bookable for the current date/time — also derived, not synced.
  const staffId = staffIdSel && grid && date && time && grid.isBookable(staffIdSel, date.date, time) ? staffIdSel : null;

  const firstOpenTrainer =
    grid && date && time ? trainers.find((t) => grid.isBookable(t.id, date.date, time)) : undefined;

  const selectedTrainer = staffId ? trainers.find((t) => t.id === staffId) : undefined;
  const staffText = selectedTrainer
    ? selectedTrainer.name
    : firstOpenTrainer
      ? `${firstOpenTrainer.name}（自動割当）`
      : "指名なし";

  function pickDate(i: number) {
    setDateIdx(i);
  }
  function pickTime(i: number) {
    if (!timeSlotBookable(dateIdx, i)) return;
    setTimeIdxSel(i);
  }
  function pickStaff(id: string | null) {
    if (id === null) {
      setStaffIdSel(null);
      return;
    }
    if (!grid || !date || !time || !grid.isBookable(id, date.date, time)) return;
    setStaffIdSel(id);
  }

  async function submit() {
    if (!date || !time) return;
    if (!form.name.trim() || !form.email.includes("@")) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/public/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          date: date.date,
          time,
          trainerId: staffId,
          name: form.name,
          email: form.email,
          phone: form.phone,
          note: form.note,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(errorMessage(data.error));
        return;
      }
      localStorage.setItem(STORAGE_KEY, data.reservation.id);
      setActiveRes(data.reservation);
      setDone(data);
      setShowForm(false);
    } catch {
      setSubmitError("通信エラーが発生しました。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  }

  const badgeText = plan.single ? "都度払いプラン" : `${plan.name} 残 ${plan.count}回`;
  const rightTop = plan.single ? "お支払い" : "予約後の残回数";
  const rightBig = plan.single ? plan.price : `残 ${plan.count - 1}回`;
  const summary = date && time ? `${plan.name}・パーソナル90分\n${staffText}／${date.label} ${time}` : "";

  const canBook = !activeRes && slotBookable && !!date && !!time;
  const btnLabel = activeRes
    ? "セッション終了までご予約中です"
    : !slotBookable
      ? "満席／受付停止中です"
      : "お客様情報を入力して予約";

  if (!activeChecked || !slots) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#8a93a4" }}>
        読み込み中…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#f5f7fb", position: "relative" }}>
      <header
        style={{
          background: "#16233d",
          color: "#fff",
          padding: "18px 20px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 5,
        }}
      >
        <div style={{ fontWeight: 900, letterSpacing: ".06em", fontSize: 16 }}>
          CORE<span style={{ color: "#7aa5ff" }}>.</span>PT
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255,255,255,.16)",
            padding: "5px 10px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 500,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7aa5ff" }} />
          {badgeText}
        </div>
      </header>

      <main style={{ padding: "18px 16px 180px", display: "flex", flexDirection: "column", gap: 22 }}>
        {activeRes && (
          <div
            style={{
              background: "#fff7e6",
              border: "1px solid #f0d8a8",
              borderRadius: 14,
              padding: "14px 15px",
              display: "flex",
              flexDirection: "column",
              gap: 9,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#8a5a12", display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#e0902b" }} />
              現在ご予約中です
            </div>
            <div style={{ fontSize: 11.5, color: "#6b5a30", lineHeight: 1.65 }}>
              ご予約：{activeRes.date} {activeRes.time}〜{activeRes.endTime}（パーソナル90分／{activeRes.trainerName}）
              <br />
              セッション終了までは新規のご予約をお受けできません。店舗にてセッション完了後、再度ご予約いただけます。
            </div>
          </div>
        )}

        <section>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#16233d", marginBottom: 11 }}>① コースを選ぶ</div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", padding: "2px 0 6px" }}>
            {PLANS.map((p, i) => (
              <div
                key={p.id}
                onClick={() => setPlanIdx(i)}
                style={{
                  position: "relative",
                  flex: "none",
                  width: 130,
                  background: "#fff",
                  border: `1.5px solid ${planIdx === i ? ACCENT : "#e7ebf1"}`,
                  borderRadius: 16,
                  padding: "15px 15px 14px",
                  cursor: "pointer",
                  boxShadow: planIdx === i ? `0 8px 20px -12px ${ACCENT}` : undefined,
                }}
              >
                {p.note && (
                  <div
                    style={{
                      position: "absolute",
                      top: -9,
                      right: 10,
                      fontSize: 9.5,
                      fontWeight: 700,
                      color: "#fff",
                      background: i === 3 ? "#e0902b" : ACCENT,
                      padding: "2px 8px",
                      borderRadius: 8,
                    }}
                  >
                    {p.note}
                  </div>
                )}
                <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                <div style={{ fontSize: 16, fontWeight: 900, marginTop: 7, color: ACCENT }}>{p.price}</div>
                <div style={{ fontSize: 10.5, color: "#8a93a4", marginTop: 3 }}>{p.per}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 11 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#16233d" }}>② 日付</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <PageArrow
                dir="prev"
                disabled={(slots?.offset ?? pageOffset) <= 0}
                onClick={() => pickPage(pageOffset - DATE_PAGE_SIZE)}
              />
              <PageArrow
                dir="next"
                disabled={!slots || slots.offset + dates.length >= slots.bookingWindowDays}
                onClick={() => pickPage(pageOffset + DATE_PAGE_SIZE)}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
            {dates.map((d, i) => (
              <div key={d.date} onClick={() => pickDate(i)} style={dateChipStyle(dateIdx === i, false, ACCENT)}>
                <span style={{ fontSize: 10, color: weekdayColor(d.dow) }}>{d.w}</span>
                <span style={{ fontSize: 15, fontWeight: 700, marginTop: 1 }}>{d.day}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 11 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#16233d" }}>③ 時間</span>
            <span style={{ fontSize: 10.5, color: "#8a93a4" }}>パーソナル90分・空き枠</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {times.map((t, i) => {
              const open = timeSlotBookable(dateIdx, i);
              const sel = timeIdx === i && open;
              return (
                <div
                  key={t}
                  onClick={() => pickTime(i)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 46,
                    borderRadius: 11,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: open ? "pointer" : "not-allowed",
                    background: sel ? ACCENT : "#fff",
                    color: sel ? "#fff" : open ? "#1a2233" : "#c2c8d2",
                    border: `1.5px solid ${sel ? ACCENT : "#e7ebf1"}`,
                    opacity: open ? 1 : 0.6,
                  }}
                >
                  <span>{t}</span>
                  {!open && <span style={{ fontSize: 9, color: "#b7bec9", marginTop: 2 }}>受付停止</span>}
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 11 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#16233d" }}>④ 担当</span>
            <span style={{ fontSize: 10.5, color: "#8a93a4" }}>
              {date && time ? `${date.label} ${time} の担当` : ""}
            </span>
          </div>
          <div style={{ display: "flex", gap: 11, overflowX: "auto" }}>
            <StaffChip
              name="指名なし"
              initial="A"
              photoUrl={null}
              selected={!staffId}
              avail={slotBookable}
              note=""
              onClick={() => pickStaff(null)}
            />
            {trainers.map((t) => {
              const avail = !!grid && !!date && !!time && grid.isBookable(t.id, date.date, time);
              const booking = !!grid && !!date && !!time && grid.isOpen(t.id, date.date, time) && grid.isBooked(t.id, date.date, time);
              return (
                <StaffChip
                  key={t.id}
                  name={t.name}
                  initial={t.initial}
                  photoUrl={t.photoUrl}
                  selected={staffId === t.id}
                  avail={avail}
                  note={avail ? "" : booking ? "予約済" : "受付停止"}
                  onClick={() => pickStaff(t.id)}
                />
              );
            })}
          </div>
        </section>
      </main>

      <div
        style={{
          position: "sticky",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#fff",
          borderTop: "1px solid #eef1f6",
          boxShadow: "0 -8px 24px -14px rgba(20,40,80,.3)",
          padding: "12px 16px 16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 11.5, color: "#4a5468", lineHeight: 1.5, whiteSpace: "pre-line" }}>{summary}</div>
          <div style={{ textAlign: "right", flex: "none", marginLeft: 10 }}>
            <div style={{ fontSize: 9.5, color: "#8a93a4" }}>{rightTop}</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: "#16233d" }}>{rightBig}</div>
          </div>
        </div>
        <div
          onClick={() => canBook && setShowForm(true)}
          style={{
            textAlign: "center",
            padding: 16,
            borderRadius: 14,
            fontWeight: 700,
            fontSize: 14,
            cursor: canBook ? "pointer" : "not-allowed",
            background: canBook ? ACCENT : "#c2c8d2",
            color: "#fff",
          }}
        >
          {btnLabel}
        </div>
      </div>

      {showForm && (
        <div
          onClick={() => setShowForm(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(15,25,45,.42)", display: "flex", alignItems: "flex-end", zIndex: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 480,
              margin: "0 auto",
              background: "#fff",
              borderRadius: "24px 24px 0 0",
              padding: "20px 18px 22px",
              animation: "sheetUp .32s cubic-bezier(.2,.9,.3,1)",
              display: "flex",
              flexDirection: "column",
              gap: 13,
              maxHeight: "92vh",
              overflowY: "auto",
            }}
          >
            <div style={{ width: 38, height: 4, background: "#dfe5ee", borderRadius: 3, margin: "-6px auto 0" }} />
            <div style={{ fontSize: 16, fontWeight: 900 }}>お客様情報の入力</div>
            <div style={{ fontSize: 11, color: "#8a93a4", marginTop: -8 }}>
              {plan.name}・{staffText}／{date?.label} {time}〜
            </div>
            <FormField label="お名前" required>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="山田 太郎"
                style={inputStyle}
              />
            </FormField>
            <FormField label="メールアドレス" required>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                style={inputStyle}
              />
            </FormField>
            <FormField label="電話番号">
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="090-1234-5678"
                style={inputStyle}
              />
            </FormField>
            <FormField label="ご要望・備考">
              <textarea
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                rows={2}
                placeholder="気になる部位・体調など"
                style={{ ...inputStyle, resize: "none" }}
              />
            </FormField>
            {submitError && <div style={{ fontSize: 11.5, color: "#d0607a" }}>{submitError}</div>}
            <div
              onClick={submitting ? undefined : submit}
              style={{
                textAlign: "center",
                padding: 15,
                borderRadius: 13,
                fontWeight: 700,
                fontSize: 14,
                marginTop: 4,
                cursor: form.name.trim() && form.email.includes("@") && !submitting ? "pointer" : "not-allowed",
                background: form.name.trim() && form.email.includes("@") && !submitting ? ACCENT : "#c2c8d2",
                color: "#fff",
              }}
            >
              {submitting ? "送信中…" : "予約を確定してメール送信"}
            </div>
            <div style={{ fontSize: 10, color: "#9aa4b4", textAlign: "center", lineHeight: 1.5 }}>
              確定すると店舗とお客様へ確認メールが自動送信されます
            </div>
          </div>
        </div>
      )}

      {done && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#f5f7fb",
            display: "flex",
            flexDirection: "column",
            animation: "fadeUp .3s ease",
            overflowY: "auto",
            zIndex: 30,
          }}
        >
          <div style={{ maxWidth: 480, margin: "0 auto", width: "100%" }}>
            <div style={{ padding: "32px 22px 16px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 13 }}>
              <div
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: "50%",
                  background: "#eaf7f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  animation: "pop .5s ease",
                }}
              >
                <div
                  style={{
                    width: 47,
                    height: 47,
                    borderRadius: "50%",
                    background: "#16a06a",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 23,
                  }}
                >
                  ✓
                </div>
              </div>
              <div>
                <div style={{ fontSize: 19, fontWeight: 900 }}>予約が完了しました</div>
                <div style={{ fontSize: 12.5, color: "#8a93a4", marginTop: 6, lineHeight: 1.7 }}>
                  {done.reservation.date} {done.reservation.time}〜　パーソナル90分・{done.reservation.trainerName}
                  <br />
                  {done.reservation.single
                    ? `お支払い ${done.reservation.planPrice}`
                    : `${done.reservation.planName}（残 ${done.reservation.planCount - 1}回）`}
                </div>
              </div>
            </div>
            <div style={{ padding: "0 16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              <MailCard label="店舗へ予約通知を送信" mail={done.mail.store} open={showStoreMail} toggle={() => setShowStoreMail((v) => !v)} iconBg="#16233d" />
              <MailCard label="お客様へ確認メールを送信" mail={done.mail.customer} open={showCustMail} toggle={() => setShowCustMail((v) => !v)} iconBg={ACCENT} />
              <div style={{ background: "#fff7e6", border: "1px solid #f0d8a8", borderRadius: 12, padding: "12px 14px", fontSize: 11, color: "#6b5a30", lineHeight: 1.6 }}>
                次回のご予約は、今回のセッション終了後に可能になります。
              </div>
              <div
                onClick={() => setDone(null)}
                style={{ textAlign: "center", padding: 14, borderRadius: 13, fontWeight: 700, fontSize: 13, background: "#16233d", color: "#fff", cursor: "pointer", marginTop: 2 }}
              >
                閉じる
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 6,
  padding: "12px 13px",
  border: "1.5px solid #e0e5ee",
  borderRadius: 11,
  fontSize: 13,
  fontFamily: "inherit",
  color: "#1a2233",
  background: "#fbfcfe",
  outline: "none",
};

function PageArrow({ dir, disabled, onClick }: { dir: "prev" | "next"; disabled: boolean; onClick: () => void }) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        width: 26,
        height: 26,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        fontWeight: 700,
        cursor: disabled ? "default" : "pointer",
        background: disabled ? "#f0f2f6" : "#eef3fc",
        color: disabled ? "#c2c8d2" : ACCENT,
      }}
    >
      {dir === "prev" ? "‹" : "›"}
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#4a5468" }}>
        {label} {required && <span style={{ color: "#e2607a" }}>*</span>}
      </div>
      {children}
    </div>
  );
}

function StaffChip({
  name,
  initial,
  photoUrl,
  selected,
  avail,
  note,
  onClick,
}: {
  name: string;
  initial: string;
  photoUrl: string | null;
  selected: boolean;
  avail: boolean;
  note: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: "none",
        width: 66,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: 2,
        cursor: avail ? "pointer" : "not-allowed",
        opacity: avail ? 1 : 0.4,
      }}
    >
      {photoUrl ? (
        <div style={{ width: 54, height: 54, borderRadius: "50%", boxShadow: `0 0 0 2.5px ${selected ? ACCENT : "transparent"}`, overflow: "hidden" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      ) : (
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 17,
            background: selected ? "#16233d" : "#eef1f6",
            color: selected ? "#fff" : "#6b7688",
            border: `2.5px solid ${selected ? ACCENT : "transparent"}`,
          }}
        >
          {initial}
        </div>
      )}
      <div style={{ fontSize: 11, fontWeight: 700, marginTop: 6 }}>{name}</div>
      <div style={{ fontSize: 9, marginTop: 3, color: "#b7bec9", fontWeight: 500 }}>{note}</div>
    </div>
  );
}

function MailCard({
  label,
  mail,
  open,
  toggle,
  iconBg,
}: {
  label: string;
  mail: MailPreview;
  open: boolean;
  toggle: () => void;
  iconBg: string;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e7ebf1", borderRadius: 14, overflow: "hidden" }}>
      <div onClick={toggle} style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 15px", cursor: "pointer" }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: iconBg, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
          ✉
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700 }}>{label}</div>
          <div style={{ fontSize: 10.5, color: "#8a93a4" }}>To: {mail.to}</div>
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: mail.sent ? "#16a06a" : "#c98a2b" }}>
          {mail.sent ? "送信済 ▾" : "未送信 ▾"}
        </div>
      </div>
      {open && (
        <div style={{ borderTop: "1px solid #f0f2f6", padding: "12px 15px", background: "#fafbfd" }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "#16233d", marginBottom: 8 }}>件名：{mail.subject}</div>
          {mail.lines.map((l, i) => (
            <div key={i} style={{ fontSize: 11.5, color: "#4a5468", lineHeight: 1.85 }}>
              {l}
            </div>
          ))}
          {!mail.sent && mail.error && (
            <div style={{ fontSize: 10.5, color: "#c98a2b", marginTop: 8 }}>
              ※ SMTP未設定のためプレビューのみ表示しています（{mail.error}）
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function errorMessage(code: string): string {
  switch (code) {
    case "already_has_active_reservation":
      return "現在ご予約中のセッションがあるため、新しいご予約はできません。";
    case "trainer_unavailable":
      return "選択した担当は、この時間ちょうど埋まってしまいました。担当を変更してください。";
    case "slot_full":
      return "この時間は満席になりました。別の時間をお選びください。";
    case "name_required":
      return "お名前を入力してください。";
    case "email_invalid":
      return "メールアドレスを確認してください。";
    default:
      return "予約できませんでした。もう一度お試しください。";
  }
}
