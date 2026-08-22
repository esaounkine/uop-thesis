import { useState } from 'react';
import { getStatus } from '../../lib/api.js';
import { Loader } from '../../components/loader/Loader.jsx';
import { ErrorMessage } from '../../components/error-message/ErrorMessage.jsx';
import styles from './Status.module.css';

const formatBytes = (bytes) => {
  const gb = bytes / 1e9;

  return gb >= 1
    ? `${gb.toFixed(1)} GB`
    : `${Math.round(bytes / 1e6)} MB`;
};

const StatusPanel = ({ data }) => {
  const columns = Object.keys(data.providers[0]?.records ?? {});

  return (
    <div className={styles.Panel}>
      <table>
        <thead>
        <tr>
          <th>Provider</th>
          <th>Key</th>
          <th>Req/s</th>
          {columns.map((column) =>
            <th key={column}>{column}</th>)}
        </tr>
        </thead>
        <tbody>
        {data.providers.map((provider) =>
          <tr key={provider.id}>
            <td>{provider.id}</td>
            <td>{provider.apiKey ?? '-'}</td>
            <td>{provider.requestsPerSecond}</td>
            {columns.map((column) =>
              <td key={column}>{provider.records[column]}</td>)}
          </tr>)}
        </tbody>
      </table>
      <p className={styles.System}>
        {[
          `version ${data.version}`,
          `RAM ${formatBytes(data.system.memory.freeBytes)} / ${formatBytes(data.system.memory.totalBytes)}`,
          `Disk ${formatBytes(data.system.disk.freeBytes)} / ${formatBytes(data.system.disk.totalBytes)}`,
        ].join(' · ')}
      </p>
    </div>
  );
};

export const Status = () => {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ status: 'idle' });

  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }

    setOpen(true);

    if (state.status === 'done' || state.status === 'loading') {
      return;
    }

    setState({ status: 'loading' });

    try {
      const data = await getStatus();
      setState({ status: 'done', data: data });
    } catch (error) {
      setState({ status: 'error', error: error.message });
    }
  };

  return (
    <footer className={styles.Status}>
      <button
        type="button"
        className={`secondary outline ${styles.Toggle}`}
        onClick={toggle}
      >
        {open ? 'Hide status' : 'Show status'}
      </button>
      {open && state.status === 'loading' &&
        <Loader label="Loading status..." />}
      {open && state.status === 'error' &&
        <ErrorMessage title="Status unavailable" message={state.error} />}
      {open && state.status === 'done' &&
        <StatusPanel data={state.data} />}
    </footer>
  );
};
