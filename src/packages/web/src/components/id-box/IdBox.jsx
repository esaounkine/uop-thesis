import styles from './IdBox.module.css';

export const IdBox = ({ value }) => {
  return <code className={styles.IdBox}>{value}</code>;
};
