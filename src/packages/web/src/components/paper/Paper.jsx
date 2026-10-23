import styles from './Paper.module.css';
import { Chip } from '../chip/Chip.jsx';

export const Paper = ({ title, year, citations }) => {
  return (
    <div className={styles.Paper}>
      <span>{title}</span>
      <div className={styles.Attributes}>
        {year != null &&
          <Chip label={`${year}`} />
        }
        {citations != null &&
          <span className={styles.Meta}>{`cited by ${citations}`}</span>
        }
      </div>
    </div>
  );
};
