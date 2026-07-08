import { prisma } from "@/lib/prisma";
import { runSeed } from "@/lib/seedData";

function page(title: string, body: string) {
  return new Response(
    `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${title}</title>
    <style>body{font-family:system-ui,sans-serif;max-width:520px;margin:60px auto;padding:0 20px;color:#1a2233;line-height:1.8}
    .box{background:#f5f7fb;border-radius:14px;padding:20px 24px;margin-top:16px}
    a{color:#2f6bed}</style></head>
    <body><h2>${title}</h2>${body}</body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

// Visit this URL once, in a browser, after the first successful deploy —
// creates the admin login + sample trainers/customers. Safe to load more
// than once: it's a no-op once an admin account already exists, so it can't
// be used to reset data after initial setup.
export async function GET() {
  const already = await prisma.adminUser.count();
  if (already > 0) {
    return page(
      "セットアップ済みです",
      `<p>すでに初期設定は完了しています。何もしていません。</p><p><a href="/admin/login">管理画面を開く →</a></p>`
    );
  }

  const { username, password } = await runSeed(prisma);
  return page(
    "セットアップ完了！",
    `<p>初期データを作成しました。</p>
     <div class="box">
       <div>管理画面ログイン</div>
       <div>ユーザー名：<b>${username}</b></div>
       <div>パスワード：<b>${password}</b></div>
     </div>
     <p style="margin-top:20px"><a href="/admin/login">管理画面を開く →</a>　|　<a href="/book">お客様アプリを開く →</a></p>`
  );
}
