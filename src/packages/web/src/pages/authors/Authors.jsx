import { useSearchParams } from 'react-router-dom';
import { AuthorSearch } from '../../containers/author-search/AuthorSearch.jsx';
import styles from './Authors.module.css';

export const Authors = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';

  const search = (term) => {
    setSearchParams({ q: term });
  };

  return (
    <main className={styles.Container}>
      <h1>Author search</h1>
      <AuthorSearch query={query} onSearch={search} />
    </main>
  );
};
