import styles from './TitledSection.module.css';

export const TitledSection = ({ title, children }) => {
  return (
    <section className={styles.TitledSection}>
      <h2>{title}</h2>
      {children}
    </section>
  );
};