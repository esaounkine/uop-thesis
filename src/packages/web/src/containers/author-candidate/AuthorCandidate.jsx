import { useEffect, useState } from 'react';
import { getAuthorPapers } from '../../lib/api.js';
import styles from './AuthorCandidate.module.css';
import { Author } from '../../components/author/Author.jsx';
import { Loader } from '../../components/loader/Loader.jsx';
import { ErrorMessage } from '../../components/error-message/ErrorMessage.jsx';
import { Paper } from '../../components/paper/Paper.jsx';

const PREVIEW_LIMIT = 3;

const getSamplePapers = (papers) => {
  return [...papers]
    .sort((left, right) =>
      (right.year ?? 0) - (left.year ?? 0))
    .slice(0, PREVIEW_LIMIT);
};

export const AuthorCandidate = ({ provider, author }) => {
  const [papers, setPapers] = useState({ status: 'loading' });

  useEffect(() => {
    let stale = false;

    getAuthorPapers(provider, author.authorId)
      .then(({ papers: fetched }) => {
        if (!stale) {
          setPapers({
            status: 'done',
            papers: fetched,
          });
        }
      })
      .catch((error) => {
        if (!stale) {
          setPapers({
            status: 'error',
            error: error.message,
          });
        }
      });

    return () => {
      stale = true;
    };
  }, [provider, author.authorId]);

  return (
    <li className={styles.Candidate}>
      <Author
        authorId={author.authorId}
        organisation={author.organisation}
        originalName={author.originalName} />
      {papers.status === 'loading' &&
        <Loader label="Fetching papers..." />
      }
      {papers.status === 'error' &&
        <ErrorMessage title="Fetching papers failed" message={papers.error} />
      }
      {papers.status === 'done' &&
        <ul className={styles.Papers}>
          {getSamplePapers(papers.papers).map((paper) =>
            <Paper
              key={paper.pubId}
              title={paper.title}
              year={paper.year} />,
          )}
        </ul>
      }
    </li>
  );
};
