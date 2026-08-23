import { wire } from './app.js';
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

const printSection = (provider) => {
  console.log(`\n=== ${provider} ===`);
};

const args = process.argv.slice(2);
const providers = wire();

const printUsageAndDie = () => {
  console.error(`
Usage:
node src/cli.js -a <provider>:<authorId>
node src/cli.js -an <author name>

Active providers: ${providers.map((provider) =>
  provider.id).join(', ')}
`);
  process.exit(1);
};

const parseId = (value) => {
  const [_pId, ..._parts] = value.split(':');
  const _id = _parts.join(':');
  const provider = providers.find(({ id }) =>
    id === _pId);

  if (!_pId || !_id || !provider) {
    printUsageAndDie();
  }

  return {
    provider: provider,
    id: _id,
  };
};

const runAuthorById = async (value) => {
  const {
    provider, id,
  } = parseId(value);

  printSection(provider.id);

  const result = await withQueueProgressReport(provider.queue, () =>
    provider.classification.getAuthorMetrics(id), provider.id);

  if (!result) {
    console.error(`Author not found: ${id}`);
    process.exit(1);
  }

  printAuthorMetrics(result);
};

const resolveAuthor = async (provider, name) => {
  const candidates = await provider.authors.searchByName(name);

  const shortlist = candidates.slice(0, CANDIDATE_LIMIT);
  const settled = await Promise.allSettled(
    shortlist.map(async (author) => {
      const { publications } = await provider.authors.getPublications(
        author.authorId,
      );

      return {
        ...author,
        papers: publications,
      };
    }),
  );

  return settled.map((result, index) =>
    (result.status === 'fulfilled'
      ? result.value
      : shortlist[index]));
};

const runAuthorSearch = async (name) => {
  await Promise.all(providers.map(async (provider) => {
    const candidates = await withQueueProgressReport(
      provider.queue,
      () =>
        resolveAuthor(provider, name),
      provider.id);

    printSection(provider.id);

    printAuthorCandidates(name, candidates);
  }));
};

const handlers = {
  '-a': runAuthorById,
  '-an': runAuthorSearch,
};

const handler = handlers[args[0]];
const value = args.slice(1).join(' ');

if (!handler || !value) {
  printUsageAndDie();
}

await handler(value);
