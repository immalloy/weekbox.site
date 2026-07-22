import { NextResponse } from "next/server";
import {
  diagnosticSchema,
  formatDiagnosticEmbed,
} from "../../../lib/diagnostics";
import { allowsRequest } from "../../../lib/rate-limit";

const MAX_BODY_BYTES = 12_000;

function corsHeaders(request: Request) {
  const headers = new Headers();
  const origin = request.headers.get("origin") ?? "";
  const isWeekBoxOrigin =
    /^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):\d+$/i.test(origin);
  if (!isWeekBoxOrigin) return headers;
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Max-Age", "600");
  headers.set("Vary", "Origin");
  return headers;
}

function json(request: Request, body: unknown, init: ResponseInit = {}) {
  const headers = corsHeaders(request);
  new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  return NextResponse.json(body, {
    ...init,
    headers,
  });
}

function clientKey(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  );
}

function validWebhook(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "discord.com" || url.hostname.endsWith(".discord.com"))
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(contentLength) || contentLength > MAX_BODY_BYTES)
    return json(
      request,
      { error: "Request body is too large." },
      { status: 413 },
    );
  if (!allowsRequest(clientKey(request)))
    return json(
      request,
      { error: "Too many reports. Try again later." },
      { status: 429, headers: { "Retry-After": "60" } },
    );

  let payload: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES)
      return json(
        request,
        { error: "Request body is too large." },
        { status: 413 },
      );
    payload = JSON.parse(raw);
  } catch {
    return json(
      request,
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = diagnosticSchema.safeParse(payload);
  if (!parsed.success)
    return json(
      request,
      {
        error: "Invalid diagnostic report.",
        details: parsed.error.issues.map(
          (issue) => issue.path.join(".") || "body",
        ),
      },
      { status: 422 },
    );
  if (!validWebhook(process.env.DISCORD_WEBHOOK_URL))
    return json(
      request,
      { error: "Diagnostic reporting is not configured." },
      { status: 503 },
    );

  try {
    const response = await fetch(process.env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        embeds: [formatDiagnosticEmbed(parsed.data)],
        allowed_mentions: { parse: [] },
      }),
    });
    if (!response.ok)
      return json(
        request,
        { error: "Could not deliver diagnostic report." },
        { status: 502 },
      );
  } catch {
    return json(
      request,
      { error: "Could not deliver diagnostic report." },
      { status: 502 },
    );
  }
  return json(request, { accepted: true }, { status: 202 });
}

export function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}
