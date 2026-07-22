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

export function formatDiagnosticReport(report: DiagnosticReport): string {
  const safe = {
    ...report,
    errorMessage: redactSensitiveText(report.errorMessage),
    stackTrace: redactSensitiveText(report.stackTrace)
  };
  return [
    '**WeekBox diagnostic report**',
    `**Version:** ${safe.appVersion}`,
    `**System:** ${safe.operatingSystem} · ${safe.architecture}`,
    `**Action:** ${safe.action}`,
    `**Error:** ${safe.errorMessage}`,
    `**Stack trace:**\n\`\`\`\n${safe.stackTrace}\n\`\`\``
  ].join('\n');
}
