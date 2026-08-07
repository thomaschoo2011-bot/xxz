const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", ...headers } });

const enc = new TextEncoder();
const b64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
const cookieValue = request => (request.headers.get("cookie") || "").split(";").map(x => x.trim()).find(x => x.startsWith("xxz_admin="))?.slice(10);

async function sign(value, secret) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64(await crypto.subtle.sign("HMAC", key, enc.encode(value)));
}

async function authenticated(request, env) {
  const token = cookieValue(request);
  if (!token || !env.SESSION_SECRET) return false;
  const [expires, nonce, signature] = token.split(".");
  if (!expires || !nonce || !signature || Number(expires) < Date.now()) return false;
  return signature === await sign(`${expires}.${nonce}`, env.SESSION_SECRET);
}

async function ensureSchema(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL CHECK(kind IN ('publications','conferences','software','articles','news')),
    locale TEXT NOT NULL DEFAULT 'zh' CHECK(locale IN ('zh','en')),
    year INTEGER,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    authors TEXT DEFAULT '',
    venue TEXT DEFAULT '',
    date_text TEXT DEFAULT '',
    abstract TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    links_json TEXT DEFAULT '[]',
    featured INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

function cleanItem(body) {
  const kinds = ["publications", "conferences", "software", "articles", "news"];
  if (!kinds.includes(body.kind) || !["zh", "en"].includes(body.locale) || !String(body.title || "").trim()) return null;
  let links = [];
  try { links = Array.isArray(body.links) ? body.links : JSON.parse(body.links || "[]"); } catch {}
  return {
    kind: body.kind, locale: body.locale, year: Number(body.year) || null,
    type: String(body.type || "").slice(0, 80), title: String(body.title).trim().slice(0, 500),
    authors: String(body.authors || "").slice(0, 500), venue: String(body.venue || "").slice(0, 500),
    date: String(body.date || "").slice(0, 100), abstract: String(body.abstract || "").slice(0, 2000),
    image_url: String(body.image_url || "").slice(0, 1000), links: JSON.stringify(links).slice(0, 4000),
    featured: body.featured ? 1 : 0, sort_order: Number(body.sort_order) || 0
  };
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const path = Array.isArray(params.path) ? params.path.join("/") : String(params.path || "");
  if (!env.DB) return json({ error: "D1 binding DB is not configured" }, 503);

  if (path === "login" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    const valid = body.username === (env.ADMIN_USERNAME || "admin") && body.password === env.ADMIN_PASSWORD;
    if (!valid) return json({ error: "用户名或密码错误" }, 401);
    if (!env.SESSION_SECRET) return json({ error: "SESSION_SECRET is not configured" }, 503);
    const expires = Date.now() + 8 * 60 * 60 * 1000;
    const nonce = crypto.randomUUID();
    const token = `${expires}.${nonce}.${await sign(`${expires}.${nonce}`, env.SESSION_SECRET)}`;
    return json({ ok: true }, 200, { "set-cookie": `xxz_admin=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800` });
  }

  if (path === "logout" && request.method === "POST")
    return json({ ok: true }, 200, { "set-cookie": "xxz_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0" });

  await ensureSchema(env.DB);

  if (path === "content" && request.method === "GET") {
    const url = new URL(request.url);
    const kind = url.searchParams.get("kind");
    const locale = url.searchParams.get("locale") || "zh";
    if (!["publications", "conferences", "software", "articles", "news"].includes(kind) || !["zh", "en"].includes(locale))
      return json({ error: "Invalid query" }, 400);
    const result = await env.DB.prepare("SELECT * FROM content WHERE kind=? AND locale=? ORDER BY featured DESC, sort_order DESC, year DESC, id DESC").bind(kind, locale).all();
    const items = result.results.map(x => ({ ...x, date: x.date_text, featured: Boolean(x.featured), links: JSON.parse(x.links_json || "[]") }));
    return json({ items });
  }

  const publicFileMatch = path.match(/^files\/(.+)$/);
  if (publicFileMatch && request.method === "GET" && env.FILES) {
    const object = await env.FILES.get(decodeURIComponent(publicFileMatch[1]));
    if (!object) return new Response("Not found", { status: 404 });
    return new Response(object.body, { headers: { "content-type": object.httpMetadata?.contentType || "application/octet-stream", "cache-control": "public, max-age=31536000, immutable" } });
  }

  if (!await authenticated(request, env)) return json({ error: "Unauthorized" }, 401);

  if (path === "session" && request.method === "GET") return json({ ok: true });

  if (path === "content" && request.method === "POST") {
    const item = cleanItem(await request.json().catch(() => ({})));
    if (!item) return json({ error: "Invalid content" }, 400);
    const result = await env.DB.prepare(`INSERT INTO content
      (kind,locale,year,type,title,authors,venue,date_text,abstract,image_url,links_json,featured,sort_order)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(item.kind,item.locale,item.year,item.type,item.title,item.authors,item.venue,item.date,item.abstract,item.image_url,item.links,item.featured,item.sort_order).run();
    return json({ ok: true, id: result.meta.last_row_id }, 201);
  }

  const match = path.match(/^content\/(\d+)$/);
  if (match && request.method === "PUT") {
    const item = cleanItem(await request.json().catch(() => ({})));
    if (!item) return json({ error: "Invalid content" }, 400);
    await env.DB.prepare(`UPDATE content SET kind=?,locale=?,year=?,type=?,title=?,authors=?,venue=?,date_text=?,abstract=?,image_url=?,links_json=?,featured=?,sort_order=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .bind(item.kind,item.locale,item.year,item.type,item.title,item.authors,item.venue,item.date,item.abstract,item.image_url,item.links,item.featured,item.sort_order,Number(match[1])).run();
    return json({ ok: true });
  }
  if (match && request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM content WHERE id=?").bind(Number(match[1])).run();
    return json({ ok: true });
  }

  if (path === "upload" && request.method === "POST") {
    if (!env.FILES) return json({ error: "R2 binding FILES is not configured" }, 503);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size > 25 * 1024 * 1024) return json({ error: "文件无效或超过25MB" }, 400);
    const allowed = /\.(png|jpe?g|gif|webp|svg|pdf|docx?|pptx?)$/i;
    if (!allowed.test(file.name)) return json({ error: "不支持该文件类型" }, 400);
    const safe = file.name.replace(/[^\w.\-]+/g, "_");
    const key = `${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}-${safe}`;
    await env.FILES.put(key, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" } });
    return json({ ok: true, url: `/api/files/${encodeURIComponent(key)}` }, 201);
  }

  return json({ error: "Not found" }, 404);
}
