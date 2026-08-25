import os from 'node:os';
import { readFileSync, statfsSync } from 'node:fs';

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
  constructor(providers, statsRepository) {
    this.providers = providers;
    this.statsRepository = statsRepository;
  }

  async getStatus() {
    return {
      version: version,
      providers: await Promise.all(this.providers.map(async (provider) => {
        return {
          id: provider.id,
          apiKey: maskValue(provider.apiKey),
          requestsPerSecond: provider.requestsPerSecond,
          quota: await this.fetchQuota(provider),
          records: this.statsRepository.countByProvider(provider.id),
        };
      })),
      system: getSystemStats(),
    };
  }

  async fetchQuota(provider) {
    try {
      const quota = await provider.connector?.getQuota?.();

      return quota ?? null;
    } catch {
      // TODO when catching errors, print a log message
      return null;
    }
  }
}
