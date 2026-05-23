const BASE_API_URL = import.meta.env.VITE_API_URL || '';

const apiUrl = (path) => {
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  return BASE_API_URL ? `${BASE_API_URL}${path}` : path;
};

export const apiFetch = (path, options) => fetch(apiUrl(path), options);
export const apiUrlFor = apiUrl;
