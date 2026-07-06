import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/adminGuard";

const ACCEPT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request, ctx: RouteContext<"/api/admin/trainers/[id]/photo">) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const trainer = await prisma.trainer.findUnique({ where: { id } });
  if (!trainer) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File)) return NextResponse.json({ error: "photo_required" }, { status: 400 });

  const ext = ACCEPT[file.type];
  if (!ext) return NextResponse.json({ error: "unsupported_type" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "too_large" }, { status: 400 });

  const dir = path.join(process.cwd(), "public", "uploads", "trainers");
  await mkdir(dir, { recursive: true });
  const filename = `${id}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), bytes);

  const photoUrl = `/uploads/trainers/${filename}?v=${Date.now()}`;
  const updated = await prisma.trainer.update({ where: { id }, data: { photoUrl } });
  return NextResponse.json({ trainer: updated });
}
