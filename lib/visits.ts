import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

let writes = Promise.resolve();

function counterPath() {
  return process.env.VISIT_COUNTER_PATH ?? resolve(process.cwd(), 'data', 'visits.json');
}

async function readCount(path: string): Promise<number> {
  try {
    const value: unknown = JSON.parse(await readFile(path, 'utf8'));
    if (typeof value === 'object' && value !== null && typeof (value as { count?: unknown }).count === 'number' && Number.isSafeInteger((value as { count: number }).count) && (value as { count: number }).count >= 0) return (value as { count: number }).count;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  return 0;
}

export function incrementVisits(): Promise<number> {
  const job = writes.then(async () => {
    const path = counterPath();
    await mkdir(dirname(path), { recursive: true });
    const count = (await readCount(path)) + 1;
    const temporaryPath = `${path}.${process.pid}.tmp`;
    await writeFile(temporaryPath, JSON.stringify({ count }) + '\n', { encoding: 'utf8', mode: 0o600 });
    await rename(temporaryPath, path);
    return count;
  });
  writes = job.then(() => undefined, () => undefined);
  return job;
}
