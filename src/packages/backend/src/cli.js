import { createApp } from './app.js';
import { withQueueProgressReport } from './lib/queue-progress.js';

const printMetrics = (
  {
    publication, metrics, citations,
  },
  skipDebug = true,
) => {
  console.log(`
Paper: ${publication.pubId} - ${publication.title}
Total citations: ${metrics.total}
Self: ${metrics.self.total}
  direct ${metrics.self.direct}
  co-author ${metrics.self.coauthor}
External: ${metrics.external}

Debug details (per citation):
${skipDebug
  ? 'skipped'
  : JSON.stringify(citations, null, 2)}
 `);
};

const [pubId] = process.argv.slice(2);

if (!pubId) {
  console.error('Usage: node src/cli.js <paperId>');
  process.exit(1);
}

const {
  classificationService,
  requestQueue,
} = createApp();

const result = await withQueueProgressReport(
  requestQueue,
  () =>
    classificationService.getPaperMetrics(pubId),
);

if (!result) {
  console.error(`Paper not found: ${pubId}`);
  process.exit(1);
}

printMetrics(result);
