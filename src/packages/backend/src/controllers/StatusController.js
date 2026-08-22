import os from 'node:os';
import { readFileSync, statfsSync } from 'node:fs';
import { selectProvider } from '../connectors/providers/registry.js';

const { version } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url)),
);

const maskValue = (key, showChars = -4) =>
  (key
    ? `****${key.slice(showChars)}`
    : null);

const getSystemStats = () => {
  const {
    bsize, blocks, bavail,
  } = statfsSync(process.cwd());

  return {
    memory: {
      totalBytes: os.totalmem(),
      freeBytes: os.freemem(),
    },
    disk: {
      totalBytes: blocks * bsize,
      freeBytes: bavail * bsize,
    },
  };
};

export class StatusController {
  constructor(providers, stats) {
    this.providers = providers;
    this.stats = stats;
  }

  async getStatus() {
    return {
      version: version,
      providers: await Promise.all(this.providers.map(async (provider) => {
        const spec = selectProvider(provider.id);

        return {
          id: provider.id,
          apiKey: maskValue(spec.apiKey),
          requestsPerSecond: spec.requestsPerSecond,
          quota: await this.fetchQuota(provider),
          records: this.stats.countByProvider(provider.id),
        };
      })),
      system: getSystemStats(),
    };
  }

  // Best effort: a provider without a quota, or a failed lookup, reports null.
  async fetchQuota(provider) {
    try {
      const quota = await provider.connector?.getQuota?.();

      return quota ?? null;
    } catch {
      return null;
    }
  }
}
