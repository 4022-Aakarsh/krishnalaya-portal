import { getStore } from "@netlify/blobs";

export const config = { path: "/api/edits" };

const H = { "content-type": "application/json", "cache-control": "no-store" };
const j = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: H });
const akey = (a) => a.ak || a.dorm + ":" + a.sn;

export default async (req) => {
  const store = getStore("krishnalaya");
  const cur = (await store.get("edits", { type: "json" })) || { v: 0, mod: {}, add: [] };

  if (req.method === "GET") return j(cur);
  if (req.method !== "POST") return j({ error: "method" }, 405);

  const pw = process.env.ADMIN_PASSWORD;
  let body;
  try { body = await req.json(); } catch { return j({ error: "bad json" }, 400); }
  if (!pw || body.password !== pw) return j({ error: "unauthorized" }, 401);
  if (body.verify) return j({ ok: true });

  const e = body.edits || {};
  cur.mod = cur.mod || {};
  cur.add = cur.add || [];
  Object.keys(e.mod || {}).forEach((k) => { cur.mod[k] = Object.assign({}, cur.mod[k] || {}, e.mod[k]); });
  (e.add || []).forEach((a) => {
    const i = cur.add.findIndex((x) => akey(x) === akey(a));
    if (i < 0) cur.add.push(a); else cur.add[i] = a;
  });
  if (Array.isArray(e.tabs)) cur.tabs = e.tabs;
  cur.v = Date.now();

  const out = JSON.stringify(cur);
  if (out.length > 5_000_000) return j({ error: "too large" }, 413);
  await store.set("edits", out);
  return j({ ok: true, v: cur.v });
};
