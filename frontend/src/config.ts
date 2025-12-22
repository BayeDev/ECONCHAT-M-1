// API Configuration
// In production on Vercel, use empty string so requests go through Next.js rewrites (avoiding CORS)
// In development, use localhost backend

const isServer = typeof window === 'undefined';
const isProduction = process.env.NODE_ENV === 'production';

// In browser on production: ALWAYS use empty string (relative URLs go through Vercel rewrites)
// This avoids CORS issues by proxying through Next.js
// In browser on dev: use localhost
// On server (SSR): can use the full Railway URL
export const API_URL = !isServer && isProduction
  ? ''  // Browser in production: use relative URLs (go through Vercel rewrites)
  : isServer && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL  // Server-side: use env var if set
    : 'http://localhost:3001';  // Development: use localhost
