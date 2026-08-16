import { createApp } from './app.js';
import { withQueueProgressReport } from './lib/queue-progress.js';

const CANDIDATE_LIMIT = 10;
const PREVIEW_LIMIT = 3; // papers per author or authors per paper, when listing either

const getMostRecentPapers = (publications, limit) =>
  [...publications]
    .sort((left, right) =>
      (right.year ?? 0) - (left.year ?? 0))
    .slice(0, limit);

const toPaperView = (paper) =>
  [
    paper.pubId,
    paper.title,
    paper.year,
  ]
    .filter(Boolean)
    .join(' | ');

const toAuthorLabel = (author) =>
  [
    author.authorId,
    author.originalName,
    author.organisation,
    author.papers && `papers: ${author.papers.length}`,
  ]
    .filter(Boolean)
    .join(' | ');

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
Paper: ${toPaperView(publication)}
${formatMetrics(metrics)}

Debug details (per citation):
${skipDebug
  ? 'skipped'
  : JSON.stringify(citations, null, 2)}
`);
};

const printAuthorMetrics = ({
  author, metrics, stats,
}) => {
  console.log(`
Author: ${toAuthorLabel(author)}
Papers fetched: ${stats.fetched} of ${stats.total}${stats.failed
  ? ` (failed to fetch: ${stats.failed})`
  : ''}

${formatMetrics(metrics)}

`);
};

const printPaperCandidates = (name, candidates) => {
  console.log(`Matches for "${name}":`);
  candidates.slice(0, CANDIDATE_LIMIT).forEach((publication) => {
    console.log(`- ${toPaperView(publication)}`);
    const authorNames = (publication.contributions ?? [])
      .slice(0, PREVIEW_LIMIT)
      .map((contribution) =>
        contribution.authorName);
    if (authorNames.length) {
      console.log(`${authorNames.join('\n')}`);
    }
  });
};

const printAuthorCandidates = (name, candidates) => {
  console.log(`Matches for "${name}":`);
  candidates
    .slice(0, CANDIDATE_LIMIT)
    .forEach((author) => {
      console.log(`- ${toAuthorLabel(author)}`);
      if (author.papers?.length) {
        const recentPapers = getMostRecentPapers(author.papers, PREVIEW_LIMIT)
          .map(toPaperView)
          .join('\n');
        console.log(`${recentPapers}`);
      }
    });
};

const printUsageAndDie = () => {
  console.error(`
Usage:
node src/cli.js -p <paperId>
node src/cli.js -pn <paper name>
node src/cli.js -a <authorId>
node src/cli.js -an <author name>
`);
  process.exit(1);
};

const args = process.argv.slice(2);
const {
  classificationService,
  publicationService,
  authorService,
  requestQueue,
} = createApp();

const runPaperMetrics = async (pubId) => {
  const result = await withQueueProgressReport(requestQueue, () =>
    classificationService.getPaperMetrics(pubId));

  if (!result) {
    console.error(`Paper not found: ${pubId}`);
    process.exit(1);
  }

  printMetrics(result);
};

const runAuthorMetrics = async (authorId) => {
  const result = await withQueueProgressReport(requestQueue, () =>
    classificationService.getAuthorMetrics(authorId));

  if (!result) {
    console.error(`Author not found: ${authorId}`);
    process.exit(1);
  }

  printAuthorMetrics(result);
};

const runPaperSearch = async (name) => {
  const candidates = await withQueueProgressReport(requestQueue, () =>
    publicationService.searchByName(name));

  if (candidates.length === 0) {
    console.error(`No papers match: ${name}`);
    process.exit(1);
  } else if (candidates.length === 1) {
    await runPaperMetrics(candidates[0].pubId);
  } else {
    printPaperCandidates(name, candidates);
  }
};

const runAuthorSearch = async (name) => {
  const candidates = await withQueueProgressReport(requestQueue, () =>
    authorService.searchByName(name));

  if (candidates.length === 0) {
    console.error(`No authors match: ${name}`);
    process.exit(1);
  } else if (candidates.length === 1) {
    await runAuthorMetrics(candidates[0].authorId);
  } else {
    const settled = await withQueueProgressReport(requestQueue, () =>
      Promise.allSettled(
        candidates
          .slice(0, CANDIDATE_LIMIT)
          .map(async (author) => {
            const { publications } = await authorService.getPublications(
              author.authorId,
            );

            return {
              ...author,
              papers: publications,
            };
          }),
      ));
    const withPapers = settled.map((result, index) =>
      (result.status === 'fulfilled'
        ? result.value
        : candidates[index]));
    printAuthorCandidates(name, withPapers);
  }
};

const handlers = {
  '-p': runPaperMetrics,
  '-pn': runPaperSearch,
  '-a': runAuthorMetrics,
  '-an': runAuthorSearch,
};

const handler = handlers[args[0]];
const value = args.slice(1).join(' ');

if (!handler || !value) {
  printUsageAndDie();
}

await handler(value);
