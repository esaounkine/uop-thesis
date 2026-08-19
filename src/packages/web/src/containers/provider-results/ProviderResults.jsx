import { useState } from 'react';
import styles from './ProviderResults.module.css';
import { TabNav } from '../../components/tab-nav/TabNav.jsx';
import { ErrorMessage } from '../../components/error-message/ErrorMessage.jsx';
import { AuthorCandidate } from '../author-candidate/AuthorCandidate.jsx';
import { Toggle } from '../../components/toggle/Toggle.jsx';

export const ProviderResults = ({ results }) => {
  const [active, setActive] = useState(results[0]?.provider);
  const [papersRequested, setPapersRequested] = useState({});

  const activeEntry = results.find((entry) => entry.provider === active);

  const togglePapers = (provider) => {
    setPapersRequested({
      ...papersRequested,
      [provider]: !papersRequested[provider],
    });
  };

  return (
    <>
      <TabNav
        tabs={results.map((entry) => {
          return {
            id: entry.provider,
            label: entry.provider,
          };
        })}
        active={active}
        onSelect={setActive} />

      <section
        key={activeEntry.provider}
        className={styles.Panel}>
        {activeEntry.error != null
          ? <ErrorMessage
            title={`${activeEntry.provider} failed`}
            message={activeEntry.error} />
          : <>
            <div className={styles.Controls}>
              <Toggle
                options={[{ label: 'Hide papers', value: false }, { label: 'Show papers', value: true }]}
                value={!!papersRequested[activeEntry.provider]}
                onChange={() => togglePapers(activeEntry.provider)}
              />
            </div>
            <ul>
              {activeEntry.authors.map((author) =>
                <AuthorCandidate
                  key={author.authorId}
                  provider={activeEntry.provider}
                  author={author}
                  showPapers={Boolean(papersRequested[activeEntry.provider])} />,
              )}
            </ul>
          </>
        }
      </section>
    </>
  );
};
