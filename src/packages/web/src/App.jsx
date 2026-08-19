import { Navigate, Route, Routes } from 'react-router-dom';
import { Authors } from './pages/authors/Authors.jsx';

export const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/authors" replace />} />
      <Route path="/authors" element={<Authors />} />
    </Routes>
  );
};
