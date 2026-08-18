const baseUrl = import.meta.env.VITE_API_URL;

const get = async (path) => {
  const response = await fetch(`${baseUrl}${path}`);

  if (!response.ok) {
    throw new Error(`GET ${path} failed: ${response.status}`);
  }

  return response.json();
};

export const searchAuthors = (query) =>
  get(`/search/authors?q=${encodeURIComponent(query)}`);
