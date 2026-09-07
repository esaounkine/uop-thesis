import { useParams } from 'react-router-dom';
import { Chip } from '../../components/chip/Chip.jsx';
import { AuthorDetails } from '../../containers/author-details/AuthorDetails.jsx';
import styles from './Authors.module.css';

export const AuthorPage = () => {
  const { provider, authorId } = useParams();

  return (
    <main className={styles.Container}>
      <div className={styles.Title}>
        <h1>Author</h1>
        <Chip label={provider} />
      </div>
      <AuthorDetails
        key={`${provider}:${authorId}`}
        provider={provider}
        authorId={authorId} />
    </main>
  );
};
