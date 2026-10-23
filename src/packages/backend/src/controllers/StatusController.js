import os from 'node:os';
import { readFileSync, statfsSync } from 'node:fs';

const { version } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url)),
);

const maskValue = (key, showChars = -4) =>
  (key
    ? `****${key.slice(showChars)}`
    : null);

const maskQuotas = (quotas) =>
  quotas.map((quota) => {
    return {
      ...quota,
      apiKey: maskValue(quota.apiKey),
    };
  });

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
      providers: await Promise.all(
        this.providers.map(async (provider) => {
          const quotas = await this.fetchQuotas(provider);

          return {
            id: provider.id,
            requestsPerSecond: provider.httpClient.queue?.requestsPerSecond,
            quotas: maskQuotas(quotas),
            records: this.statsRepository.countByProvider(provider.id),
          };
        })),
      system: getSystemStats(),
    };
  }

  async fetchQuotas(connector) {
    try {
      return await connector.getQuotas();
    } catch (error) {
      process.stderr.write(`quota fetch failed: ${error.message}\n`);

      return [];
    }
  }
}
