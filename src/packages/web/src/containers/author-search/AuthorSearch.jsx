import { useEffect, useState } from 'react';
import { searchAuthors } from '../../lib/api.js';
import styles from './AuthorSearch.module.css';
import { ProviderResults } from '../provider-results/ProviderResults.jsx';
import { Loader } from '../../components/loader/Loader.jsx';
import { ErrorMessage } from '../../components/error-message/ErrorMessage.jsx';

export const AuthorSearch = ({ query, onSearch }) => {
  const [input, setInput] = useState(query);
  const [state, setState] = useState({ status: 'idle' });

  useEffect(() => {
    setInput(query);

    if (!query) {
      setState({ status: 'idle' });
      return undefined;
    }

    let stale = false;
    setState({ status: 'loading' });

    searchAuthors(query)
      .then((results) => {
        if (!stale) {
          setState({
            status: 'done',
            results: results,
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
  }, [query]);

  const submit = (event) => {
    event.preventDefault();
    onSearch(input.trim());
  };

  return (
    <section>
      <form className={styles.Form} onSubmit={submit}>
        <input
          value={input}
          onChange={(event) =>
            setInput(event.target.value)}
          placeholder="Author name"
        />
        <button type="submit">Search</button>
      </form>
      {state.status === 'loading' &&
        <Loader label="Searching..." />
      }
      {state.status === 'error' &&
        <ErrorMessage title="Search failed" message={state.error} />
      }
      {state.status === 'done' &&
        <ProviderResults results={state.results} />
      }
    </section>
  );
};
