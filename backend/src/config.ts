export const isDev = process.env.NODE_ENV !== 'production';

export const frontendURL = isDev ? 'http://localhost:5173/' : '/';

export const backendURL = isDev ? 'http://localhost:8080' : process.env.BACKEND_URL || '';

export const port = process.env.PORT || 8080;

