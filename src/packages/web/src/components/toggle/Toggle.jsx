import styles from './Toggle.module.css';

export const Toggle = ({ label, options, value, onChange }) => {
  if (label) {
    return (
      <label className={styles.Switch}>
        <input
          type="checkbox"
          role="switch"
          checked={value}
          onChange={(event) =>
            onChange(event.target.checked)} />
        <span>{label}</span>
      </label>
    );
  }

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
            title={option.label}
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
