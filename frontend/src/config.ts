// API Configuration
// In production, this should be set via NEXT_PUBLIC_API_URL environment variable
// Fallback to Railway URL if not set

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://econchat-m-1-production.up.railway.app';
