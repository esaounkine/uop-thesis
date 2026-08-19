import styles from './ErrorMessage.module.css';

export const ErrorMessage = ({ title, message }) => {
  return (
    <p className={styles.ErrorMessage} role="alert">
      {title && <span className={styles.Title}>{title}</span>}
      {message}
    </p>
  );
};
