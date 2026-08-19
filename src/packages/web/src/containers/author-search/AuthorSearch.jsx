import { useEffect, useState } from 'react';
import { searchAuthors } from '../../lib/api.js';
import styles from './AuthorSearch.module.css';
import { TitledSection } from '../../components/titled-section/TitledSection.jsx';
import { Author } from '../../components/author/Author.jsx';

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
        /*TODO replace with a progress loader*/
        <p>Searching…</p>
      }
      {state.status === 'error' &&
        /*TODO replace with an error component*/
        <p>Search failed: {state.error}</p>
      }
      {state.status === 'done' &&
        state.results.map((entry) => {
          return (
            entry.error != null
              ? <p>Provider failed: {entry.error}</p> /*TODO replace with the error component*/
              : <TitledSection
                key={entry.provider}
                title={entry.provider}>
                <ul>
                  {entry.authors.map((author) =>
                    <Author
                      key={author.authorId}
                      authorId={author.authorId}
                      organisation={author.organisation}
                      originalName={author.originalName} />,
                  )}
                </ul>
              </TitledSection>
          );
        })
      }
    </section>
  );
};
