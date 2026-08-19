import styles from './Author.module.css';
import { Chip } from '../chip/Chip.jsx';
import { IdBox } from '../id-box/IdBox.jsx';

export const Author = ({ originalName, organisation, authorId }) => {
  return (
    <div className={styles.Header}>
      {originalName}
      <Chip label={organisation} />
      <IdBox value={authorId} />
    </div>
  );
};
