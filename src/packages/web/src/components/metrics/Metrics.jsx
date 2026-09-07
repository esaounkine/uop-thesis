import styles from './Metrics.module.css';

export const Metrics = ({ metrics, stats }) => {
  return (
    <div className={styles.Metrics}>
      <span>{`Total citations: ${metrics.total}`}</span>
      <div className={styles.Breakdown}>
        <span className={styles.External}>{`External: ${metrics.external}`}</span>
        <span className={styles.Self}>{`Self: ${metrics.self.total}`}</span>
        <div className={styles.Breakdown}>
          <span className={styles.Direct}>{`direct: ${metrics.self.direct}`}</span>
          <span className={styles.Coauthor}>{`co-author: ${metrics.self.coauthor}`}</span>
        </div>
      </div>
      {stats &&
        <span>{`Publications fetched: ${stats.fetched} of ${stats.total}${stats.failed
          ? ` (${stats.failed} failed)`
          : ''}`}</span>
      }
    </div>
  );
};
