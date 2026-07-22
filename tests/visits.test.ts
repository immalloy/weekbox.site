import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { incrementVisits } from '../lib/visits';

let directory = '';
afterEach(async () => { delete process.env.VISIT_COUNTER_PATH; if (directory) await rm(directory, { recursive: true, force: true }); directory = ''; });

describe('persistent visit counter', () => {
  it('increments from the value saved on disk', async () => {
    directory = await mkdtemp(join(tmpdir(), 'weekbox-visits-'));
    process.env.VISIT_COUNTER_PATH = join(directory, 'visits.json');
    await expect(incrementVisits()).resolves.toBe(1);
    await expect(incrementVisits()).resolves.toBe(2);
  });
});
