import styles from './Chip.module.css';

const hueOf = (text) => {
  return text
    .split('')
    .reduce((hash, char) =>
        (hash * 31 + char.charCodeAt(0)) % 360,
      0);
};

export const Chip = ({ label, muted = false }) => {
  if (!label) {
    return null;
  }

  const hue = hueOf(label);

  return (
    <span
      className={styles.Chip}
      style={{
        backgroundColor: `hsl(${hue} ${muted ? 0 : 70}% 88%)`,
        borderColor: `hsl(${hue} ${muted ? 0 : 45}% 60%)`,
        color: `hsl(${hue} ${muted ? 0 : 55}% 25%)`,
      }}
    >
      {label}
    </span>
  );
};
