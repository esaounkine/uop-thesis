import styles from './Chip.module.css';

const hueOf = (text) => {
  return text
    .split('')
    .reduce((hash, char) =>
        (hash * 31 + char.charCodeAt(0)) % 360,
      0);
};

export const Chip = ({ label }) => {
  if (!label) {
    return null;
  }

  const hue = hueOf(label);

  return (
    <span
      className={styles.Chip}
      style={{
        backgroundColor: `hsl(${hue} 70% 88%)`,
        borderColor: `hsl(${hue} 45% 60%)`,
        color: `hsl(${hue} 55% 25%)`,
      }}
    >
      {label}
    </span>
  );
};
