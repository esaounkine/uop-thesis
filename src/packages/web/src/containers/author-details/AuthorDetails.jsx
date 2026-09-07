import { useEffect, useState } from 'react';
import { getAuthor } from '../../lib/api.js';
import { Loader } from '../../components/loader/Loader.jsx';
import { ErrorMessage } from '../../components/error-message/ErrorMessage.jsx';
import { AuthorCandidate } from '../author-candidate/AuthorCandidate.jsx';

export const AuthorDetails = ({ provider, authorId }) => {
  const [state, setState] = useState({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stale = false;

    getAuthor(provider, authorId)
      .then(({ author }) => {
        if (!stale) {
          setState({
            status: 'ready',
            author: author,
          });
        }
      })
      .catch((error) => {
        if (!stale) {
          setState({
            status: 'error',
            error: error.message,
          });
        }
      });

    return () => {
      stale = true;
    };
  }, [provider, authorId, attempt]);

  return (
    <>
      {state.status === 'loading' && <Loader label="Loading author..." />}
      {state.status === 'error' && <>
        <ErrorMessage title="Loading author failed" message={state.error} />
        <button type="button" onClick={() => {
          setState({ status: 'loading' });
          setAttempt(attempt + 1);
        }}>Retry</button>
      </>}
      {state.status === 'ready' && <ul>
        <AuthorCandidate provider={provider} author={state.author} standalone />
      </ul>}
    </>
  );
};
