import { Link } from 'react-router-dom';
import styles from './Author.module.css';
import { Chip } from '../chip/Chip.jsx';
import { IdBox } from '../id-box/IdBox.jsx';

export const Author = ({ originalName, organisation, authorId, href }) => {
  return (
    <div className={styles.Header}>
      {href
        ? <Link to={href}>{originalName}</Link>
        : originalName}
      {organisation?.trim()
        ? <Chip label={organisation} />
        : <Chip label="Unknown affiliation" muted />}
      <IdBox value={authorId} />
    </div>
  );
};
