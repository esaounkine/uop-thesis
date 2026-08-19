import styles from './Loader.module.css';

export const Loader = ({ label }) => {
  return (
    <p className={styles.Loader}>
      {label}
    </p>
  );
};
