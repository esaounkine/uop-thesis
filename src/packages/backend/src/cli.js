import { createApp } from './app.js';
import { withQueueProgressReport } from './lib/queue-progress.js';

const CANDIDATE_LIMIT = 10;

const formatMetrics = (metrics) =>
  `Total citations: ${metrics.total}
Self: ${metrics.self.total}
  direct ${metrics.self.direct}
  co-author ${metrics.self.coauthor}
External: ${metrics.external}`;

const printMetrics = ({
  publication, metrics, citations,
}, skipDebug = true) => {
  console.log(`
Paper: ${publication.pubId} - ${publication.title}
${formatMetrics(metrics)}

Debug details (per citation):
${skipDebug
  ? 'skipped'
  : JSON.stringify(citations, null, 2)}
`);
};

const printAuthorMetrics = ({
  author, metrics, publications,
}) => {
  console.log(`
Author: ${author.authorId} - ${author.originalName}
Publication count: ${publications.length}

${formatMetrics(metrics)}

`);
};

const printCandidates = (name, candidates) => {
  console.log(`Matches for "${name}":`);
  candidates.slice(0, CANDIDATE_LIMIT).forEach((publication) => {
    console.log(`- ${publication.pubId}  ${publication.title}`);
  });
};

const printUsageAndDie = () => {
  console.error(`
Usage:
node src/cli.js <paperId>
node src/cli.js name <paper title>
node src/cli.js author <authorId>
`);
  process.exit(1);
};

const args = process.argv.slice(2);
const {
  classificationService,
  publicationService,
  requestQueue,
} = createApp();

const runMetrics = async (pubId) => {
  const result = await withQueueProgressReport(requestQueue, () =>
    classificationService.getPaperMetrics(pubId));

  if (!result) {
    console.error(`Paper not found: ${pubId}`);
    process.exit(1);
  }

  printMetrics(result);
};

if (args[0] === 'author') {
  const authorId = args[1];

  if (!authorId) {
    printUsageAndDie();
  }

  const result = await withQueueProgressReport(requestQueue, () =>
    classificationService.getAuthorMetrics(authorId));

  if (!result) {
    console.error(`Author not found: ${authorId}`);
    process.exit(1);
  }

  printAuthorMetrics(result);
} else if (args[0] === 'name') {
  const name = args.slice(1).join(' ');

  if (!name) {
    printUsageAndDie();
  }

  const candidates = await withQueueProgressReport(requestQueue, () =>
    publicationService.searchByName(name));

  if (candidates.length === 0) {
    console.error(`No papers match: ${name}`);
    process.exit(1);
  } else if (candidates.length === 1) {
    await runMetrics(candidates[0].pubId);
  } else {
    printCandidates(name, candidates);
  }
} else if (args[0]) {
  await runMetrics(args[0]);
} else {
  printUsageAndDie();
}
