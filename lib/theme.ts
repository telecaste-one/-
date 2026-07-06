import type { CSSProperties } from "react";

// Design tokens ported 1:1 from 予約システム.dc.html (project/予約システム.dc.html).
export const ACCENT = "#2f6bed";
export const NAVY = "#16233d";
export const BG = "#e9edf3";
export const SCREEN_BG = "#f5f7fb";
export const TEXT = "#1a2233";

export function softBg(accent: string) {
  return `${accent}1a`;
}

export function dateChipStyle(selected: boolean, dark: boolean, accent: string): CSSProperties {
  return {
    flex: "none",
    width: 46,
    height: 56,
    borderRadius: 14,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    background: dark ? (selected ? accent : "rgba(255,255,255,.08)") : selected ? softBg(accent) : "#fff",
    border: dark ? undefined : `1.5px solid ${selected ? accent : "#e7ebf1"}`,
    color: dark ? "#fff" : selected ? accent : "#1a2233",
  };
}

export function weekdayColor(dow: number): string {
  return dow === 0 ? "#e2607a" : dow === 6 ? "#5b8def" : "#9aa4b4";
}
