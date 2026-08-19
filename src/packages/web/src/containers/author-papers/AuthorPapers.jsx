import { useState } from 'react';
import styles from './AuthorPapers.module.css';
import { Paper } from '../../components/paper/Paper.jsx';
import { Toggle } from '../../components/toggle/Toggle.jsx';

const PREVIEW_LIMIT = 5;

const SORT_BY = {
  YEAR: 'year',
  CITATIONS: 'citations',
};

const SORT_OPTIONS = [
  {
    value: SORT_BY.YEAR,
    label: 'Recent',
  },
  {
    value: SORT_BY.CITATIONS,
    label: 'Most cited',
  },
];

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
          <Toggle
            options={SORT_OPTIONS}
            value={sortBy}
            onChange={setSortBy} />
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
