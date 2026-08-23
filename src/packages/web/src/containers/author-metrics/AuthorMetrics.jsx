import { lazy, Suspense, useEffect, useState } from 'react';
import { getJob, submitJob } from '../../lib/api.js';
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

export const AuthorMetrics = ({ provider, authorId }) => {
  const [requestId, setRequestId] = useState(null);
  const [state, setState] = useState({ status: 'idle' });

  const start = async () => {
    setState({ status: 'running' });

    try {
      const submitted = await submitJob({
        provider: provider,
        id: authorId,
      });
      setRequestId(submitted.requestId);
    } catch (error) {
      setState({
        status: 'error',
        error: error.message,
      });
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
          setState({
            status: 'done',
            result: job.result,
          });
          return;
        }

        if (job.status !== JOB_STATUS.RUNNING) {
          setState({
            status: 'error',
            error: job.error ?? `job ${job.status}`,
          });
          return;
        }

        setState({
          status: 'running',
          progress: job.progress,
        });
        timer = setTimeout(check, POLL_MS);
      } catch (error) {
        if (!stale) {
          setState({
            status: 'error',
            error: error.message,
          });
        }
      }
    };

    check();

    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [requestId]);

  return (
    <div className={styles.AuthorMetrics}>
      {state.status === 'idle' &&
        <button type="button" onClick={start}>
          Fetch citation metrics
        </button>
      }
      {state.status === 'running' &&
        <Loader
          label={`Fetching metrics... (${state.progress?.done ?? 0} done / ${state.progress?.queued ?? 0} queued / ${state.progress?.failed ?? 0} failed)`} />
      }
      {state.status === 'error' &&
        <ErrorMessage title="Fetching metrics failed" message={state.error} />
      }
      {state.status === 'done' &&
        <>
          <Metrics
            metrics={state.result.metrics}
            stats={state.result.stats}
          />
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
    </div>
  );
};
