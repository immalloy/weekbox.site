import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../app/api/diagnostic-report/route';
import { redactSensitiveText } from '../lib/diagnostics';
import { resetRateLimitForTests } from '../lib/rate-limit';

const valid = { appVersion: '1.0.0', operatingSystem: 'Windows 11', architecture: 'x64', action: 'Opening calendar', errorMessage: 'Unexpected problem', stackTrace: 'at run (C:\\Users\\Casey\\WeekBox\\app.ts:4:2)' };
const request = (body: unknown) => new Request('http://localhost/api/diagnostic-report', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.5' }, body: JSON.stringify(body) });

beforeEach(() => { process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test'; resetRateLimitForTests(); });
afterEach(() => { delete process.env.DISCORD_WEBHOOK_URL; vi.unstubAllGlobals(); });

describe('diagnostic reports', () => {
  it('rejects invalid reports and does not forward them', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    const response = await POST(request({ ...valid, stackTrace: '' }));
    expect(response.status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('redacts user paths and email addresses', () => {
    expect(redactSensitiveText('C:\\Users\\Casey\\WeekBox\\main.ts /home/alex/.config alex@example.com')).toBe('[REDACTED_WINDOWS_PATH] [REDACTED_USER_PATH] [REDACTED_EMAIL]');
  });

  it('forwards only the formatted, redacted report to Discord', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 })); vi.stubGlobal('fetch', fetchMock);
    const response = await POST(request(valid));
    expect(response.status).toBe(202);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, options] = fetchMock.mock.calls[0] as [string, { body: string }];
    expect(options.body).toContain('"embeds"');
    expect(options.body).toContain('[REDACTED_WINDOWS_PATH]');
    expect(options.body).not.toContain('Casey');
  });
});
