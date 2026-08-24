const baseUrl = import.meta.env.VITE_API_URL ?? '';

const get = async (path) => {
  const response = await fetch(`${baseUrl}${path}`);

  if (!response.ok) {
    throw new Error(`GET ${path} failed: ${response.status}`);
  }

  return response.json();
};

const post = async (path, body) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`POST ${path} failed: ${response.status}`);
  }

  return response.json();
};

export const searchAuthors = (query) =>
  get(`/search/authors?q=${encodeURIComponent(query)}`);

export const getAuthorPapers = (provider, authorId) =>
  get(`/authors/${encodeURIComponent(provider)}/${encodeURIComponent(authorId)}/papers`);

export const getStoredMetrics = (provider, authorId) =>
  get(`/authors/${encodeURIComponent(provider)}/${encodeURIComponent(authorId)}/metrics`);

export const submitJob = (job) =>
  post('/jobs', job);

export const getJob = (requestId) =>
  get(`/jobs/${requestId}`);

export const getStatus = () =>
  get('/status');
