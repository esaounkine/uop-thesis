import { useState } from 'react';
import styles from './CitationGraph.module.css';

export const GraphHelp = ({ onClose }) => {
  const [step, setStep] = useState(0);

  return (
    <aside className={styles.Help} onKeyDown={(event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    }}>
      <header className={styles.HelpHeader}>
        <strong>Reading the graph</strong>
        <button type="button" onClick={onClose}>Close hints</button>
      </header>
      {step === 0 && <>
        <svg viewBox="0 0 360 140" role="img">
          <title>An author connects to their paper; another paper cites it</title>
          <path d="M60 55H180H300" stroke="currentColor" fill="none" />
          <path d="M60 38L77 55L60 72L43 55Z" fill="var(--author-color)" />
          <path d="M180 38L197 72H163Z" fill="var(--paper-color)" />
          <circle cx="300" cy="55" r="12" fill="var(--external-color)" />
          <text x="60" y="104">Author</text>
          <text x="180" y="104">Their paper</text>
          <text x="300" y="104">Citing paper</text>
        </svg>
        <p>Lines link the author to their papers, and citing papers to the papers they cite.</p>
      </>}
      {step === 1 && <>
        <svg viewBox="0 0 360 110" role="img">
          <title>Red means direct, orange means co-author, grey means external</title>
          <circle cx="60" cy="35" r="14" fill="var(--direct-color)" />
          <circle cx="180" cy="35" r="14" fill="var(--coauthor-color)" />
          <circle cx="300" cy="35" r="14" fill="var(--external-color)" />
          <text x="60" y="80">Direct</text>
          <text x="180" y="80">Co-author</text>
          <text x="300" y="80">External</text>
        </svg>
        <p>Direct: the selected author also wrote the citing publication. Co-author: only other authors are shared. External: no shared authors.</p>
      </>}
      {step === 2 && <>
        <svg viewBox="0 0 360 110" role="img">
          <title>Zoom, pan and inspect nodes</title>
          <g fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="55" cy="32" r="14" />
            <path d="M65 42L79 56M48 32H62M55 25V39M160 35H200M180 15V55M160 35L166 29M160 35L166 41M200 35L194 29M200 35L194 41M180 15L174 21M180 15L186 21M180 55L174 49M180 55L186 49M289 17L289 53L299 44L309 53L315 47L305 38L317 34Z" />
          </g>
          <text x="60" y="90">Scroll to zoom</text>
          <text x="180" y="90">Drag to pan</text>
          <text x="300" y="90">Hover for details</text>
        </svg>
        <p>Click a legend entry at the bottom to hide or show that group.</p>
      </>}
      <footer className={styles.HelpFooter}>
        <button type="button" disabled={step === 0} onClick={() =>
          setStep(step - 1)}>Back</button>
        <span>{step + 1} / 3</span>
        <button type="button" onClick={() => {
          if (step === 2) {
            onClose();
          } else {
            setStep(step + 1);
          }
        }}>{step === 2 ? 'Got it' : 'Next'}</button>
      </footer>
    </aside>
  );
};
