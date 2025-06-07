// project-root/proxy.ts
// deno run --allow-net --allow-read proxy.ts

import { serve } from "https://deno.land/std@0.209.0/http/server.ts";
import { serveFile } from "https://deno.land/std@0.209.0/http/file_server.ts";
import { join, fromFileUrl, dirname } from "https://deno.land/std@0.209.0/path/mod.ts";

const PORT = 8000;
const API_PREFIX = "/api/n8n";
const PROXY_TARGET = "http://localhost:5678";

// ------------------------------------------------------------
// Utility: adds CORS headers to any outgoing Response
// ------------------------------------------------------------
function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, *");
  return new Response(res.body, { status: res.status, headers });
}

// ------------------------------------------------------------
// Utility: 204 response for CORS pre-flight
// ------------------------------------------------------------
function preflight(): Response {
  return withCors(new Response(null, { status: 204 }));
}

// ------------------------------------------------------------
// Path to the folder where this file lives (= project root)
// ------------------------------------------------------------
const ROOT = dirname(fromFileUrl(import.meta.url));

// ------------------------------------------------------------
// Main HTTP handler
// ------------------------------------------------------------
async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // ---------- 1) Handle CORS pre-flight early ----------
  if (req.method === "OPTIONS") {
    return preflight();
  }

  // ---------- 2) Proxy to n8n ----------
  if (url.pathname.startsWith(API_PREFIX)) {
    const proxiedPath = url.pathname.replace(API_PREFIX, "");
    const target = `${PROXY_TARGET}${proxiedPath}${url.search}`;

    // Forward original request (method, body, headers…)
    const proxyRes = await fetch(target, {
      method: req.method,
      headers: req.headers,
      body: req.body,
      redirect: "manual",
    });

    return withCors(proxyRes);
  }

  // ---------- 3) Serve static assets ----------
  // Anything else is served from disk relative to project root
  try {
    let filePath = url.pathname;

    // default document
    if (filePath === "/") filePath = "/index.html";

    // prevent directory traversal
    filePath = decodeURIComponent(filePath);
    const absPath = join(ROOT, filePath);

    return await serveFile(req, absPath);
  } catch (_err) {
    // fallback 404
    return new Response("Not Found", { status: 404 });
  }
}

// ------------------------------------------------------------
// Boot server
// ------------------------------------------------------------
console.log(`🚀  Dev server + proxy running on http://localhost:${PORT}`);
await serve(handler, { port: PORT });
