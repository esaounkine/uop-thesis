import { useEffect, useState } from 'react';
import { getAuthorPapers } from '../../lib/api.js';
import styles from './AuthorCandidate.module.css';
import { Author } from '../../components/author/Author.jsx';
import { Loader } from '../../components/loader/Loader.jsx';
import { ErrorMessage } from '../../components/error-message/ErrorMessage.jsx';
import { AuthorPapers } from '../author-papers/AuthorPapers.jsx';
import { AuthorMetrics } from '../author-metrics/AuthorMetrics.jsx';
import { Toggle } from '../../components/toggle/Toggle.jsx';

export const AuthorCandidate = ({ provider, author, showPapers }) => {
  const [papers, setPapers] = useState({ status: 'idle' });
  const [papersRequested, setPapersRequested] = useState(false);
  const wantsPapers = showPapers || papersRequested;

  useEffect(() => {
    if (!wantsPapers || papers.status !== 'idle') {
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
  }, [provider, author.authorId, wantsPapers, papers.status]);

  return (
    <li className={styles.Candidate}>
      <Author
        authorId={author.authorId}
        organisation={author.organisation}
        originalName={author.originalName} />

      {!author.organisation?.trim() && !showPapers &&
        <div className={styles.Identify}>
          <Toggle
            label="Show papers for this author"
            value={papersRequested}
            onChange={setPapersRequested} />
        </div>
      }

      <AuthorMetrics
        provider={provider}
        authorId={author.authorId}
        storedAt={author.storedAt} />

      {wantsPapers &&
        <>
          {papers.status === 'loading' &&
            <Loader label="Fetching papers..." />
          }
          {papers.status === 'error' &&
            <>
              <ErrorMessage title="Fetching papers failed" message={papers.error} />
              <button type="button" onClick={() =>
                setPapers({ status: 'idle' })}>
                Retry papers
              </button>
            </>
          }
          {papers.status === 'done' &&
            <AuthorPapers papers={papers.papers} />
          }
        </>
      }
    </li>
  );
};
