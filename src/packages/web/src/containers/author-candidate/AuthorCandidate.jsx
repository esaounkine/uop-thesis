import { useEffect, useState } from 'react';
import { getAuthorPapers } from '../../lib/api.js';
import styles from './AuthorCandidate.module.css';
import { Author } from '../../components/author/Author.jsx';
import { Loader } from '../../components/loader/Loader.jsx';
import { ErrorMessage } from '../../components/error-message/ErrorMessage.jsx';
import { AuthorPapers } from '../author-papers/AuthorPapers.jsx';
import { AuthorMetrics } from '../author-metrics/AuthorMetrics.jsx';

export const AuthorCandidate = ({ provider, author, showPapers }) => {
  const [papers, setPapers] = useState({ status: 'idle' });

  useEffect(() => {
    if (!showPapers || papers.status !== 'idle') {
      return undefined;
    }

    setPapers({ status: 'loading' });

    getAuthorPapers(provider, author.authorId)
      .then(({ papers: fetched }) => {
        setPapers({
          status: 'done',
          papers: fetched,
        });
      })
      .catch((error) => {
        setPapers({
          status: 'error',
          error: error.message,
        });
      });
  }, [provider, author.authorId, showPapers, papers.status]);

  return (
    <li className={styles.Candidate}>
      <Author
        authorId={author.authorId}
        organisation={author.organisation}
        originalName={author.originalName} />

      <AuthorMetrics
        provider={provider}
        authorId={author.authorId}
        storedAt={author.storedAt} />

      {showPapers &&
        <>
          {papers.status === 'loading' &&
            <Loader label="Fetching papers..." />
          }
          {papers.status === 'error' &&
            <ErrorMessage title="Fetching papers failed" message={papers.error} />
          }
          {papers.status === 'done' &&
            <AuthorPapers papers={papers.papers} />
          }
        </>
      }
    </li>
  );
};
