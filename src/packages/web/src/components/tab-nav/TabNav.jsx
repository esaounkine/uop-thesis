import styles from './TabNav.module.css';

export const TabNav = ({ tabs, active, onSelect }) => {
  return (
    <div className={styles.Tabs}>
      {tabs.map((tab) =>
        <button
          key={tab.id}
          type="button"
          className={tab.id === active
            ? `${styles.Tab} ${styles.Active}`
            : styles.Tab}
          onClick={() =>
            onSelect(tab.id)}
        >
          <span className={styles.TabLabel}>{tab.label}</span>
        </button>,
      )}
    </div>
  );
};
