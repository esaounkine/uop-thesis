import { Navigate, Route, Routes } from 'react-router-dom';
import { Authors } from './pages/authors/Authors.jsx';
import { Status } from './containers/status/Status.jsx';

export const App = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/authors" replace />} />
        <Route path="/authors" element={<Authors />} />
      </Routes>
      <Status />
    </>
  );
};
