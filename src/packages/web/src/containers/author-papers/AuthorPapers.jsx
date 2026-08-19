import { useState } from 'react';
import styles from './AuthorPapers.module.css';
import { Paper } from '../../components/paper/Paper.jsx';

const PREVIEW_LIMIT = 3;

const SORT_BY = {
  YEAR: 'year',
  CITATIONS: 'citations',
};

const SORTERS = {
  [SORT_BY.YEAR]: (left, right) =>
    (right.year ?? 0) - (left.year ?? 0),
  [SORT_BY.CITATIONS]: (left, right) =>
    (right.citationCount ?? -1) - (left.citationCount ?? -1),
};

export const AuthorPapers = ({ papers }) => {
  const [expanded, setExpanded] = useState(false);
  const [sortBy, setSortBy] = useState(SORT_BY.YEAR);

  const hasCitations = papers.some((paper) =>
    paper.citationCount != null);

  const sorted = [...papers].sort(SORTERS[sortBy]);
  const visible = expanded
    ? sorted
    : sorted.slice(0, PREVIEW_LIMIT);

  return (
    <div>
      <div className={styles.Controls}>
        {hasCitations &&
          <>
            <button
              type="button"
              disabled={sortBy === SORT_BY.YEAR}
              onClick={() =>
                setSortBy(SORT_BY.YEAR)}
            >
              Most recent
            </button>
            <button
              type="button"
              disabled={sortBy === SORT_BY.CITATIONS}
              onClick={() =>
                setSortBy(SORT_BY.CITATIONS)}
            >
              Most cited
            </button>
          </>
        }
        {papers.length > PREVIEW_LIMIT &&
          <button
            type="button"
            onClick={() =>
              setExpanded(!expanded)}
          >
            {expanded
              ? 'Hide'
              : 'Show more'}
          </button>
        }
      </div>
      <ul className={styles.Papers}>
        {visible.map((paper) =>
          <Paper
            key={paper.pubId}
            title={paper.title}
            year={paper.year}
            citations={paper.citationCount} />,
        )}
      </ul>
    </div>
  );
};
