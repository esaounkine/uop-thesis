import styles from './Toggle.module.css';

export const Toggle = ({ options, value, onChange }) => {
  const selected = options.findIndex((option) =>
    option.value === value);

  return (
    <div className={styles.Container}>
      <span className={styles.OptionLabel}>{options[0].label}</span>
      <div className={styles.Toggle}>
      <span
        className={styles.Thumb}
        style={{ left: `calc(${selected * 50}%)` }} />
        {options.map((option) =>
          <button
            key={option.value}
            type="button"
            className={option.value === value
              ? `${styles.Option} ${styles.Active}`
              : styles.Option}
            onClick={() =>
              onChange(option.value)}
          >
          </button>,
        )}
      </div>
      <span className={styles.OptionLabel}>{options[1].label}</span>
    </div>
  );
};
