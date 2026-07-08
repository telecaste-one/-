"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ACCENT, softBg, dateChipStyle, weekdayColor } from "@/lib/theme";
import { DATE_PAGE_SIZE } from "@/lib/constants";
import type { TrainerDTO, ReservationDTO, CustomerListItem, CustomerDetail, AdminSlot } from "@/lib/types";
import type { DateInfo } from "@/lib/dates";

type Tab = "slots" | "list" | "cust" | "settings";

export default function AdminApp() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("slots");
  const [dates, setDates] = useState<DateInfo[]>([]);
  const [dateOffset, setDateOffset] = useState(0);
  const [dateMaxOffset, setDateMaxOffset] = useState(0);
  const [trainers, setTrainers] = useState<TrainerDTO[]>([]);
  const [trainerIdx, setTrainerIdx] = useState(0);
  const [dateIdx, setDateIdx] = useState(0);
  const [reservations, setReservations] = useState<ReservationDTO[]>([]);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(null);
  const [showTrainerMgr, setShowTrainerMgr] = useState(false);

  const loadTrainers = useCallback(async () => {
    const res = await fetch("/api/admin/trainers", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setTrainers(data.trainers);
    }
  }, []);

  const loadDates = useCallback(async (offset: number) => {
    const res = await fetch(`/api/admin/dates?offset=${offset}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setDates(data.dates);
      setDateOffset(data.offset);
      setDateMaxOffset(data.maxOffset);
    }
  }, []);

  function pickDatePage(offset: number) {
    loadDates(Math.max(0, offset));
    setDateIdx(0);
  }

  const loadReservations = useCallback(async () => {
    const res = await fetch("/api/admin/reservations", { cache: "no-store" });
    if (res.ok) setReservations((await res.json()).reservations);
  }, []);

  const loadCustomers = useCallback(async () => {
    const res = await fetch("/api/admin/customers", { cache: "no-store" });
    if (res.ok) setCustomers((await res.json()).customers);
  }, []);

  useEffect(() => {
    // Initial data load from the server — setState happens asynchronously
    // after the fetch resolves, not synchronously during this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTrainers();
    loadDates(0);
  }, [loadTrainers, loadDates]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tab === "list") loadReservations();
    if (tab === "cust") loadCustomers();
  }, [tab, loadReservations, loadCustomers]);

  const trainerIdxClamped = Math.min(trainerIdx, Math.max(0, trainers.length - 1));
  const trainer = trainers[trainerIdxClamped];
  const date = dates[dateIdx];

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const activeCount = reservations.filter((r) => r.status === "active").length;

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#f5f7fb" }}>
      <header style={{ background: "#16233d", color: "#fff", padding: "15px 18px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontWeight: 900, fontSize: 14 }}>店舗 管理</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: "#9db4de" }}>
              {tab === "slots"
                ? trainer
                  ? `${date?.label ?? ""}`
                  : ""
                : tab === "list"
                  ? `予約中 ${activeCount} 件`
                  : tab === "cust"
                    ? `登録 ${customers.length} 名`
                    : ""}
            </span>
            <span onClick={logout} style={{ fontSize: 11, color: "#7aa5ff", cursor: "pointer" }}>
              ログアウト
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,.07)", padding: 4, borderRadius: 12 }}>
          <TabButton label="予約枠" active={tab === "slots"} onClick={() => setTab("slots")} />
          <TabButton label={`予約一覧${activeCount > 0 ? `（${activeCount}）` : ""}`} active={tab === "list"} onClick={() => setTab("list")} />
          <TabButton label="顧客" active={tab === "cust"} onClick={() => setTab("cust")} />
          <TabButton label="設定" active={tab === "settings"} onClick={() => setTab("settings")} />
        </div>
      </header>

      {tab === "slots" && (
        <SlotsView
          trainers={trainers}
          trainerIdx={trainerIdxClamped}
          setTrainerIdx={setTrainerIdx}
          dates={dates}
          dateIdx={dateIdx}
          setDateIdx={setDateIdx}
          dateOffset={dateOffset}
          dateMaxOffset={dateMaxOffset}
          onPageDates={pickDatePage}
          onOpenTrainerMgr={() => setShowTrainerMgr(true)}
        />
      )}

      {tab === "list" && <ReservationsView reservations={reservations} onChanged={loadReservations} />}

      {tab === "cust" && (
        <CustomersView
          customers={customers}
          detail={customerDetail}
          onOpen={async (id) => {
            const res = await fetch(`/api/admin/customers/${id}`, { cache: "no-store" });
            if (res.ok) setCustomerDetail(await res.json());
          }}
          onBack={() => setCustomerDetail(null)}
        />
      )}

      {tab === "settings" && <SettingsView />}

      {showTrainerMgr && (
        <TrainerManagerSheet
          trainers={trainers}
          onClose={() => setShowTrainerMgr(false)}
          onChanged={loadTrainers}
        />
      )}
    </div>
  );
}

function DarkPageArrow({ dir, disabled, onClick }: { dir: "prev" | "next"; disabled: boolean; onClick: () => void }) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        flex: "none",
        width: 26,
        height: 26,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        fontWeight: 700,
        cursor: disabled ? "default" : "pointer",
        background: disabled ? "rgba(255,255,255,.05)" : "rgba(255,255,255,.14)",
        color: disabled ? "#4a5a80" : "#dbe6ff",
      }}
    >
      {dir === "prev" ? "‹" : "›"}
    </div>
  );
}

// -------------------------------------------------------------- 設定 ----

function SettingsView() {
  const [windowDays, setWindowDays] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/settings", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setWindowDays(data.bookingWindowDays);
        setInput(String(data.bookingWindowDays));
      }
    })();
  }, []);

  async function save() {
    const days = Number(input);
    if (!Number.isFinite(days) || days < 1) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingWindowDays: days }),
      });
      if (res.ok) {
        const data = await res.json();
        setWindowDays(data.bookingWindowDays);
        setInput(String(data.bookingWindowDays));
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: "16px 16px 26px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: "#fff", border: "1px solid #e7ebf1", borderRadius: 16, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#16233d" }}>予約受付日数</div>
        <div style={{ fontSize: 11.5, color: "#8a93a4", lineHeight: 1.7 }}>
          お客様アプリで予約できるのは、今日から何日先までかを設定します。ここより先の予約枠の管理（ON/OFF）は、この設定に関わらずいつでも先まで行えます。
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="number"
            min={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{ width: 90, padding: "10px 12px", border: "1.5px solid #e0e5ee", borderRadius: 11, fontSize: 14, fontFamily: "inherit", color: "#1a2233", background: "#fbfcfe", outline: "none" }}
          />
          <span style={{ fontSize: 13, color: "#4a5468" }}>日先まで</span>
        </div>
        <div
          onClick={saving ? undefined : save}
          style={{
            alignSelf: "flex-start",
            padding: "11px 20px",
            borderRadius: 11,
            fontWeight: 700,
            fontSize: 13,
            cursor: saving ? "not-allowed" : "pointer",
            background: ACCENT,
            color: "#fff",
          }}
        >
          {saving ? "保存中…" : "保存する"}
        </div>
        {saved && <div style={{ fontSize: 11.5, color: "#16a06a" }}>保存しました（現在 {windowDays} 日先まで受付中）</div>}
      </div>
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1,
        textAlign: "center",
        padding: "8px 4px",
        borderRadius: 9,
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
        background: active ? "#fff" : "transparent",
        color: active ? "#16233d" : "#9db4de",
      }}
    >
      {label}
    </div>
  );
}

// ---------------------------------------------------------------- 予約枠 ----

function SlotsView({
  trainers,
  trainerIdx,
  setTrainerIdx,
  dates,
  dateIdx,
  setDateIdx,
  dateOffset,
  dateMaxOffset,
  onPageDates,
  onOpenTrainerMgr,
}: {
  trainers: TrainerDTO[];
  trainerIdx: number;
  setTrainerIdx: (i: number) => void;
  dates: DateInfo[];
  dateIdx: number;
  setDateIdx: (i: number) => void;
  dateOffset: number;
  dateMaxOffset: number;
  onPageDates: (offset: number) => void;
  onOpenTrainerMgr: () => void;
}) {
  const trainer = trainers[trainerIdx];
  const date = dates[dateIdx];
  const [slots, setSlots] = useState<AdminSlot[]>([]);

  const load = useCallback(async () => {
    if (!trainer || !date) return;
    const res = await fetch(`/api/admin/slots?trainerId=${trainer.id}&date=${date.date}`, { cache: "no-store" });
    if (res.ok) setSlots((await res.json()).slots);
  }, [trainer, date]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function toggle(time: string) {
    if (!trainer || !date) return;
    await fetch("/api/admin/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trainerId: trainer.id, date: date.date, time }),
    });
    load();
  }

  const openCount = slots.filter((s) => s.open).length;
  const allOpen = slots.length > 0 && openCount === slots.length;

  async function toggleAll() {
    if (!trainer || !date) return;
    await fetch("/api/admin/slots", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trainerId: trainer.id, date: date.date, isOpen: !allOpen }),
    });
    load();
  }

  return (
    <div>
      <div style={{ background: "#16233d", padding: "6px 12px 11px", display: "flex", gap: 6, overflowX: "auto", alignItems: "center" }}>
        {trainers.map((t, i) => (
          <div
            key={t.id}
            onClick={() => setTrainerIdx(i)}
            style={{
              flex: "none",
              padding: "9px 13px",
              borderRadius: 11,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
              background: trainerIdx === i ? "#fff" : "rgba(255,255,255,.08)",
              color: trainerIdx === i ? "#16233d" : "#9db4de",
            }}
          >
            {t.name}
          </div>
        ))}
        <div
          onClick={onOpenTrainerMgr}
          style={{ flex: "none", padding: "9px 12px", borderRadius: 11, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", background: "rgba(122,165,255,.16)", color: "#7aa5ff" }}
        >
          ＋ 管理
        </div>
      </div>
      <div style={{ background: "#16233d", padding: "0 12px 13px", display: "flex", alignItems: "center", gap: 8 }}>
        <DarkPageArrow dir="prev" disabled={dateOffset <= 0} onClick={() => onPageDates(dateOffset - DATE_PAGE_SIZE)} />
        <div style={{ display: "flex", gap: 6, overflowX: "auto", flex: 1 }}>
          {dates.map((d, i) => (
            <div key={d.date} onClick={() => setDateIdx(i)} style={dateChipStyle(dateIdx === i, true, ACCENT)}>
              <span style={{ fontSize: 10, color: weekdayColor(d.dow) }}>{d.w}</span>
              <span style={{ fontSize: 15, fontWeight: 700, marginTop: 1 }}>{d.day}</span>
            </div>
          ))}
        </div>
        <DarkPageArrow dir="next" disabled={dateOffset >= dateMaxOffset} onClick={() => onPageDates(dateOffset + DATE_PAGE_SIZE)} />
      </div>
      <div style={{ padding: "14px 16px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: "#4a5468" }}>
            <b style={{ color: "#16233d" }}>{trainer?.name}</b>・{date?.label}
          </div>
          <div onClick={toggleAll} style={{ fontSize: 11, color: ACCENT, fontWeight: 700, cursor: "pointer" }}>
            {allOpen ? "すべて停止" : "すべて受付"}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {slots.map((s) => (
            <div
              key={s.time}
              onClick={() => toggle(s.time)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "13px 15px",
                borderRadius: 14,
                cursor: "pointer",
                background: s.open ? "#fff" : "#f4f6f9",
                border: "1px solid #e7ebf1",
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 700, width: 62 }}>{s.time}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: s.booked ? ACCENT : s.open ? "#16a06a" : "#b7bec9" }}>
                  {s.booked ? "予約済" : s.open ? "受付中" : "停止中"}
                </div>
                <div style={{ fontSize: 10.5, color: "#9aa4b4", marginTop: 2 }}>
                  {s.booked ? "予約あり・この枠は受付不可" : " "}
                </div>
              </div>
              <div style={{ width: 46, height: 27, borderRadius: 16, padding: 3, flex: "none", transition: ".18s", background: s.open ? ACCENT : "#d4dae4" }}>
                <div
                  style={{
                    width: 21,
                    height: 21,
                    borderRadius: "50%",
                    background: "#fff",
                    transition: ".18s",
                    boxShadow: "0 1px 3px rgba(0,0,0,.2)",
                    transform: `translateX(${s.open ? 19 : 0}px)`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, background: "#eaf1fe", borderRadius: 12, padding: "13px 15px", fontSize: 11.5, color: "#33507f", lineHeight: 1.7 }}>
          💡 枠をタップでON/OFF。OFFにした枠はお客様アプリで即「受付停止」になり、新規予約を受け付けません。担当者ごと・日付ごとに設定できます。
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------- 予約一覧 ----

function ReservationsView({ reservations, onChanged }: { reservations: ReservationDTO[]; onChanged: () => void }) {
  async function complete(id: string) {
    await fetch(`/api/admin/reservations/${id}/complete`, { method: "POST" });
    onChanged();
  }

  const activeCount = reservations.filter((r) => r.status === "active").length;

  return (
    <div style={{ padding: "16px 16px 26px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 11, color: "#8a93a4", marginBottom: 2 }}>
        予約中 {activeCount}件 ／ 完了後にセッションを完了操作すると、お客様は次のご予約が可能になります。
      </div>
      {reservations.map((r) => {
        const done = r.status === "completed";
        const live = r.source === "app";
        return (
          <div
            key={r.id}
            style={{
              background: "#fff",
              border: `1.5px solid ${done ? "#eef1f6" : live ? ACCENT : "#e7ebf1"}`,
              borderRadius: 16,
              padding: "14px 15px",
              display: "flex",
              flexDirection: "column",
              gap: 9,
              opacity: done ? 0.7 : 1,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    flex: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 15,
                    background: done ? "#eef1f6" : "#16233d",
                    color: done ? "#9aa4b4" : "#fff",
                  }}
                >
                  {r.customerName.trim().charAt(0)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{r.customerName}</div>
                  <div style={{ fontSize: 10.5, color: "#8a93a4" }}>{r.planName}</div>
                </div>
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "4px 9px",
                  borderRadius: 8,
                  flex: "none",
                  background: done ? "#e9f6ef" : live ? softBg(ACCENT) : "#eef1f6",
                  color: done ? "#16a06a" : live ? ACCENT : "#4a5468",
                }}
              >
                {done ? "完了" : live ? "アプリ予約" : "予約中"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: "#33507f", background: "#eef3fc", padding: "4px 9px", borderRadius: 8 }}>
                {r.date} {r.time}〜{r.endTime}
              </span>
              <span style={{ fontSize: 11, fontWeight: 500, color: "#4a5468", background: "#eef1f6", padding: "4px 9px", borderRadius: 8 }}>
                担当 {r.trainerName}
              </span>
            </div>
            <div style={{ fontSize: 10.5, color: "#9aa4b4" }}>
              {r.email} ／ {r.phone || "（未入力）"}
            </div>
            {r.status === "active" && (
              <div
                onClick={() => complete(r.id)}
                style={{ textAlign: "center", padding: 11, borderRadius: 11, fontWeight: 700, fontSize: 12.5, cursor: "pointer", background: "#16a06a", color: "#fff", marginTop: 2 }}
              >
                ✓ セッションを完了する
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- 顧客 ----

function CustomersView({
  customers,
  detail,
  onOpen,
  onBack,
}: {
  customers: CustomerListItem[];
  detail: CustomerDetail | null;
  onOpen: (id: string) => void;
  onBack: () => void;
}) {
  if (detail) {
    const c = detail.customer;
    return (
      <div style={{ padding: "12px 16px 30px", display: "flex", flexDirection: "column", gap: 15 }}>
        <div onClick={onBack} style={{ fontSize: 12, color: ACCENT, fontWeight: 700, cursor: "pointer" }}>
          ‹ 顧客一覧へ
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <div style={{ width: 54, height: 54, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 21, background: "#16233d", color: "#fff" }}>
            {c.name.trim().charAt(0)}
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900 }}>{c.name}</div>
            <div style={{ fontSize: 11, color: "#8a93a4", marginTop: 2 }}>
              {new Date(c.since).toLocaleDateString("ja-JP", { year: "numeric", month: "long" })}から利用 ／ {c.email} / {c.phone}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 9 }}>
          <div style={{ flex: 1, background: "#fff", border: "1px solid #e7ebf1", borderRadius: 14, padding: "13px 14px" }}>
            <div style={{ fontSize: 10, color: "#8a93a4" }}>累計利用</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#16233d", marginTop: 2 }}>
              {c.visits}
              <span style={{ fontSize: 11, fontWeight: 500, color: "#8a93a4" }}>回</span>
            </div>
          </div>
          <div style={{ flex: 1, background: "#fff", border: "1px solid #e7ebf1", borderRadius: 14, padding: "13px 14px" }}>
            <div style={{ fontSize: 10, color: "#8a93a4" }}>回数券 残</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: ACCENT, marginTop: 2 }}>
              {c.remaining ?? 0}
              <span style={{ fontSize: 11, fontWeight: 500, color: "#8a93a4" }}>回</span>
            </div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#16233d", marginBottom: 8 }}>次回のご予約</div>
          {detail.next ? (
            <div style={{ background: "#16233d", color: "#fff", borderRadius: 15, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>
                  {detail.next.date} {detail.next.time}〜{detail.next.endTime}
                </div>
                <div style={{ fontSize: 11, color: "#9db4de", marginTop: 3 }}>
                  担当 {detail.next.trainerName}・{detail.next.planName}
                </div>
              </div>
              <div style={{ fontSize: 22 }}>📅</div>
            </div>
          ) : (
            <div style={{ background: "#fff", border: "1px dashed #d4dae4", borderRadius: 15, padding: 16, textAlign: "center", fontSize: 12, color: "#9aa4b4" }}>
              次回のご予約はありません
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#16233d", marginBottom: 8 }}>利用実績</div>
          <div style={{ background: "#fff", border: "1px solid #e7ebf1", borderRadius: 15, overflow: "hidden" }}>
            {detail.history.map((h) => {
              const complete = h.status === "completed";
              return (
                <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 15px", borderBottom: "1px solid #f2f4f8" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: complete ? "#16a06a" : "#d0607a", flex: "none" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1a2233" }}>{h.dateLabel ?? `${h.date} ${h.time}`}</div>
                    <div style={{ fontSize: 10.5, color: "#8a93a4", marginTop: 1 }}>
                      パーソナル90分・{h.trainerName}
                    </div>
                  </div>
                  <div style={{ fontSize: 9.5, fontWeight: 700, padding: "3px 8px", borderRadius: 7, flex: "none", background: complete ? "#e9f6ef" : "#fbeaec", color: complete ? "#16a06a" : "#d0607a" }}>
                    {complete ? "完了" : "キャンセル"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "14px 16px 26px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11, color: "#8a93a4", marginBottom: 2 }}>登録顧客 {customers.length}名</div>
      {customers.map((c) => (
        <div
          key={c.id}
          onClick={() => onOpen(c.id)}
          style={{ background: "#fff", border: "1px solid #e7ebf1", borderRadius: 15, padding: "13px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
        >
          <div style={{ width: 42, height: 42, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, background: "#16233d", color: "#fff" }}>
            {c.name.trim().charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{c.name}</div>
            <div style={{ fontSize: 10.5, color: "#8a93a4", marginTop: 2 }}>
              累計{c.visits}回・{c.planName ?? "—"}
            </div>
          </div>
          <div style={{ textAlign: "right", flex: "none" }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, padding: "3px 8px", borderRadius: 7, background: c.next ? softBg(ACCENT) : "#eef1f6", color: c.next ? ACCENT : "#9aa4b4" }}>
              {c.next ? "次回あり" : "次回なし"}
            </div>
            <div style={{ fontSize: 10, color: "#b0b8c4", marginTop: 4 }}>›</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------ トレーナー管理 ----

function TrainerManagerSheet({
  trainers,
  onClose,
  onChanged,
}: {
  trainers: TrainerDTO[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      await fetch("/api/admin/trainers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setNewName("");
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (trainers.length <= 1) return;
    await fetch(`/api/admin/trainers/${id}`, { method: "DELETE" });
    onChanged();
  }

  async function uploadPhoto(id: string, file: File) {
    const form = new FormData();
    form.append("photo", file);
    await fetch(`/api/admin/trainers/${id}/photo`, { method: "POST", body: form });
    onChanged();
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,25,45,.42)", display: "flex", alignItems: "flex-end", zIndex: 20 }}>
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
          gap: 14,
          maxHeight: "88vh",
          overflowY: "auto",
        }}
      >
        <div style={{ width: 38, height: 4, background: "#dfe5ee", borderRadius: 3, margin: "-6px auto 0" }} />
        <div style={{ fontSize: 16, fontWeight: 900 }}>トレーナーの管理</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {trainers.map((t) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "#f7f9fc", border: "1px solid #eef1f6", borderRadius: 14, padding: "11px 13px" }}>
              <PhotoDropSlot photoUrl={t.photoUrl} initial={t.initial} onFile={(f) => uploadPhoto(t.id, f)} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{t.name}</div>
                <div style={{ fontSize: 10, color: "#9aa4b4", marginTop: 1 }}>写真をドラッグ＆ドロップ</div>
              </div>
              {trainers.length > 1 && (
                <div onClick={() => remove(t.id)} style={{ fontSize: 11, fontWeight: 700, color: "#d0607a", background: "#fbeaec", padding: "7px 12px", borderRadius: 9, cursor: "pointer" }}>
                  削除
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="トレーナー名を入力"
            style={{ flex: 1, padding: "12px 13px", border: "1.5px solid #e0e5ee", borderRadius: 12, fontSize: 13, fontFamily: "inherit", color: "#1a2233", background: "#fbfcfe", outline: "none" }}
          />
          <div
            onClick={busy ? undefined : add}
            style={{ padding: "12px 16px", borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: newName.trim() ? "pointer" : "not-allowed", background: newName.trim() ? ACCENT : "#c2c8d2", color: "#fff", flex: "none" }}
          >
            ＋ 追加
          </div>
        </div>
        <div style={{ fontSize: 10.5, color: "#9aa4b4", lineHeight: 1.6 }}>
          追加したトレーナーはすぐに予約枠の管理・お客様アプリの担当選択に反映されます。予約が入っているトレーナーも削除できますが、既存予約の担当欄は元の名前のまま残ります。
        </div>
      </div>
    </div>
  );
}

function PhotoDropSlot({ photoUrl, initial, onFile }: { photoUrl: string | null; initial: string; onFile: (f: File) => void }) {
  const [over, setOver] = useState(false);

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      style={{
        width: 44,
        height: 44,
        borderRadius: "50%",
        flex: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: photoUrl ? "transparent" : "#16233d",
        color: "#fff",
        fontWeight: 700,
        fontSize: 16,
        outline: over ? `2px solid ${ACCENT}` : "none",
        outlineOffset: 2,
      }}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        initial
      )}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </label>
  );
}
