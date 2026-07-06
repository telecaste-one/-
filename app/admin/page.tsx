import type { Metadata } from "next";
import AdminApp from "./AdminApp";

export const metadata: Metadata = {
  title: "店舗管理 | CORE.PT",
};

export default function AdminPage() {
  return <AdminApp />;
}
