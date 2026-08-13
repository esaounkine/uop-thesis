import { createApp } from './app.js';

const printMetrics = (result) => {
  const {
    publication, metrics,
  } = result;

  console.log(`
Paper: ${publication.pubId} - ${publication.title}
Total citations: ${metrics.total}
Self: ${metrics.self.total}
  direct ${metrics.self.direct}
  co-author ${metrics.self.coauthor}
External: ${metrics.external}

Debug details (per citation):
${JSON.stringify(result.citations, null, 2)}
 `);
};

const [pubId] = process.argv.slice(2);

if (!pubId) {
  console.error('Usage: node src/cli.js <paperId>');
  process.exit(1);
}

const { classificationService } = createApp();
const result = await classificationService.getPaperMetrics(pubId);

if (!result) {
  console.error(`Paper not found: ${pubId}`);
  process.exit(1);
}

printMetrics(result);
