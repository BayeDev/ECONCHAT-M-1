import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import {
  AdminLayout,
  DashboardPage,
  UsersPage,
  UsagePage,
  SettingsPage,
  WaitlistPage,
  AuditLogsPage,
} from './pages/admin';
import './index.css';

// Get Clerk publishable key from env
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
});

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      {clerkPubKey ? (
        <ClerkProvider publishableKey={clerkPubKey}>
          <BrowserRouter>
            <Routes>
              {/* Main chat app */}
              <Route path="/" element={<App />} />

              {/* Admin routes - protected */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="usage" element={<UsagePage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="waitlist" element={<WaitlistPage />} />
                <Route path="audit-logs" element={<AuditLogsPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ClerkProvider>
      ) : (
        // Fallback without Clerk when key not configured
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/admin/*" element={
              <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white p-8 rounded-lg shadow-md text-center">
                  <h1 className="text-xl font-bold text-gray-900 mb-2">Admin Not Configured</h1>
                  <p className="text-gray-600">Set VITE_CLERK_PUBLISHABLE_KEY to enable admin dashboard.</p>
                </div>
              </div>
            } />
          </Routes>
        </BrowserRouter>
      )}
    </QueryClientProvider>
  </React.StrictMode>
);
