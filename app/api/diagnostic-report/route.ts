import { NextResponse } from 'next/server';
import { diagnosticSchema, formatDiagnosticReport } from '../../../lib/diagnostics';
import { allowsRequest } from '../../../lib/rate-limit';

const MAX_BODY_BYTES = 12_000;

function clientKey(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function validWebhook(value: string | undefined): value is string {
  if (!value) return false;
  try { const url = new URL(value); return url.protocol === 'https:' && (url.hostname === 'discord.com' || url.hostname.endsWith('.discord.com')); }
  catch { return false; }
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (!Number.isFinite(contentLength) || contentLength > MAX_BODY_BYTES) return NextResponse.json({ error: 'Request body is too large.' }, { status: 413 });
  if (!allowsRequest(clientKey(request))) return NextResponse.json({ error: 'Too many reports. Try again later.' }, { status: 429, headers: { 'Retry-After': '60' } });

  let payload: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return NextResponse.json({ error: 'Request body is too large.' }, { status: 413 });
    payload = JSON.parse(raw);
  } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }

  const parsed = diagnosticSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid diagnostic report.', details: parsed.error.issues.map((issue) => issue.path.join('.') || 'body') }, { status: 422 });
  if (!validWebhook(process.env.DISCORD_WEBHOOK_URL)) return NextResponse.json({ error: 'Diagnostic reporting is not configured.' }, { status: 503 });

  try {
    const response = await fetch(process.env.DISCORD_WEBHOOK_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: formatDiagnosticReport(parsed.data), allowed_mentions: { parse: [] } }) });
    if (!response.ok) return NextResponse.json({ error: 'Could not deliver diagnostic report.' }, { status: 502 });
  } catch { return NextResponse.json({ error: 'Could not deliver diagnostic report.' }, { status: 502 }); }
  return NextResponse.json({ accepted: true }, { status: 202 });
}
