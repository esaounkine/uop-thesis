import styles from './Metrics.module.css';

export const Metrics = ({ metrics, stats }) => {
  return (
    <div className={styles.Metrics}>
      <span>{`Total citations: ${metrics.total}`}</span>
      <span>{`Self: ${metrics.self.total} (direct ${metrics.self.direct}, co-author ${metrics.self.coauthor})`}</span>
      <span>{`External: ${metrics.external}`}</span>
      {stats &&
        <span>{`Publications fetched: ${stats.fetched} of ${stats.total}${stats.failed
          ? ` (${stats.failed} failed)`
          : ''}`}</span>
      }
    </div>
  );
};
