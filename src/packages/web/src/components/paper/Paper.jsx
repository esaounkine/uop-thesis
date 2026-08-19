import styles from './Paper.module.css';

export const Paper = ({ title, year }) => {
  return (
    <li className={styles.Paper}>
      {year != null &&
        <span className={styles.Year}>{year}</span>
      }
      <span>{title}</span>
    </li>
  );
};
