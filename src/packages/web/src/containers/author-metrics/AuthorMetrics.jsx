import { lazy, Suspense, useEffect, useState } from 'react';
import { getJob, getStoredMetrics, submitJob } from '../../lib/api.js';
import styles from './AuthorMetrics.module.css';
import { Loader } from '../../components/loader/Loader.jsx';
import { ErrorMessage } from '../../components/error-message/ErrorMessage.jsx';
import { Metrics } from '../../components/metrics/Metrics.jsx';

const CitationGraph = lazy(() =>
  import('../../components/citation-graph/CitationGraph.jsx').then((module) => {
    return { default: module.CitationGraph };
  }));

const POLL_MS = 500;

const JOB_STATUS = {
  RUNNING: 'running',
  DONE: 'done',
};

const formatDate = (iso) =>
  new Date(iso).toISOString().split('T')[0];

export const AuthorMetrics = ({ provider, authorId, storedAt }) => {
  const [state, setState] = useState(storedAt
    ? { status: 'loading' }
    : { status: 'idle' });
  const [fetchedAt, setFetchedAt] = useState(storedAt ?? null);
  const [requestId, setRequestId] = useState(null);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    if (!storedAt) {
      return undefined;
    }

    let stale = false;

    getStoredMetrics(provider, authorId)
      .then((result) => {
        if (!stale) {
          setState({ status: 'ready', result: result });
        }
      })
      .catch((error) => {
        if (!stale) {
          setState({ status: 'error', error: error.message });
        }
      });

    return () => {
      stale = true;
    };
  }, [provider, authorId, storedAt]);

  const fetchMetrics = async (cache) => {
    setProgress({ done: 0, queued: 0, failed: 0 });

    try {
      const submitted = await submitJob({
        provider: provider,
        id: authorId,
        cache: cache,
      });
      setRequestId(submitted.requestId);
    } catch (error) {
      setProgress(null);
      setState({ status: 'error', error: error.message });
    }
  };

  useEffect(() => {
    if (!requestId) {
      return undefined;
    }

    let stale = false;
    let timer;

    const check = async () => {
      try {
        const job = await getJob(requestId);

        if (stale) {
          return;
        }

        if (job.status === JOB_STATUS.DONE) {
          const result = await getStoredMetrics(provider, authorId);

          if (stale) {
            return;
          }

          setState({ status: 'ready', result: result });
          setFetchedAt(new Date().toISOString());
          setProgress(null);
          setRequestId(null);
          return;
        }

        if (job.status !== JOB_STATUS.RUNNING) {
          setState({ status: 'error', error: job.error ?? `job ${job.status}` });
          setProgress(null);
          setRequestId(null);
          return;
        }

        setProgress(job.progress);
        timer = setTimeout(check, POLL_MS);
      } catch (error) {
        if (!stale) {
          setState({ status: 'error', error: error.message });
          setProgress(null);
          setRequestId(null);
        }
      }
    };

    check();

    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [requestId]);

  const running = progress !== null;

  return (
    <div className={styles.AuthorMetrics}>
      {state.status === 'idle' && !running &&
        <button type="button" onClick={() =>
          fetchMetrics(true)}>
          Get metrics
        </button>
      }

      {state.status === 'ready' &&
        <>
          <div className={styles.Header}>
            <span className={styles.Title}>Citation metrics</span>
            <span className={styles.AsOf}>data as of {formatDate(fetchedAt)}</span>
            <button type="button" onClick={() =>
              fetchMetrics(false)} disabled={running}>
              {running ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
          <Metrics
            metrics={state.result.metrics}
            stats={state.result.stats} />
          <details className={styles.DebugDetails}>
            <summary>Citation graph</summary>
            <Suspense fallback={<Loader label="Loading graph..." />}>
              <CitationGraph
                author={state.result.author}
                publications={state.result.publications} />
            </Suspense>
          </details>
          <details className={styles.DebugDetails}>
            <summary>Raw data</summary>
            <pre>{JSON.stringify(state.result, null, 2)}</pre>
          </details>
        </>
      }

      {state.status === 'loading' &&
        <Loader label="Loading stored metrics..." />
      }

      {running &&
        <Loader
          label={`Fetching from ${provider}… (${progress.done ?? 0} done / ${progress.queued ?? 0} queued / ${progress.failed ?? 0} failed)`} />
      }

      {state.status === 'error' &&
        <ErrorMessage title="Fetching metrics failed" message={state.error} />
      }
    </div>
  );
};
