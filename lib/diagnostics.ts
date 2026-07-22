import { z } from 'zod';

const text = (label: string, max: number) => z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);

export const diagnosticSchema = z.object({
  appVersion: text('appVersion', 80).regex(/^[0-9A-Za-z][0-9A-Za-z._+-]*$/, 'appVersion has invalid characters'),
  operatingSystem: text('operatingSystem', 100),
  architecture: text('architecture', 100),
  action: text('action', 240),
  errorMessage: text('errorMessage', 2_000),
  stackTrace: text('stackTrace', 8_000)
}).strict();

export type DiagnosticReport = z.infer<typeof diagnosticSchema>;

export function redactSensitiveText(value: string): string {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]')
    .replace(/(?:file:\/\/)?[A-Za-z]:\\Users\\(?:[^\\\r\n]+\\)*[^\\\r\n]+?(?=\s(?:\/|[A-Za-z]:|\[)|$)/gi, '[REDACTED_WINDOWS_PATH]')
    .replace(/(?:file:\/\/)?\/(?:home|Users)\/.+?(?=\s(?:\/|[A-Za-z]:|\[)|$)/g, '[REDACTED_USER_PATH]');
}

function limit(value: string, maximum: number) {
  return value.length > maximum ? `${value.slice(0, maximum - 1)}…` : value;
}

export function formatDiagnosticEmbed(report: DiagnosticReport) {
  const safe = {
    ...report,
    errorMessage: redactSensitiveText(report.errorMessage),
    stackTrace: redactSensitiveText(report.stackTrace)
  };
  return {
    title: 'WeekBox diagnostic report',
    color: 0x5865f2,
    fields: [
      { name: 'Version', value: limit(safe.appVersion, 256), inline: true },
      { name: 'System', value: limit(`${safe.operatingSystem} · ${safe.architecture}`, 256), inline: true },
      { name: 'Action', value: limit(safe.action, 1_024) },
      { name: 'Error', value: limit(safe.errorMessage, 800) },
      { name: 'Stack trace', value: `\`\`\`\n${limit(safe.stackTrace, 780)}\n\`\`\`` }
    ],
    timestamp: new Date().toISOString()
  };
}
