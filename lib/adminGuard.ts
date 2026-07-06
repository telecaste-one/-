import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyAdminSessionToken } from "./auth";

// Proxy (proxy.ts) does an optimistic redirect for page routes, but per
// Next.js's own guidance Proxy isn't a full authorization solution — every
// admin API route re-verifies the session token itself.
export async function getAdminSession() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminSessionToken(token);
}
