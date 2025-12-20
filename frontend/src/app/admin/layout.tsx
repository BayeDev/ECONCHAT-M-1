"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { setAuthToken, adminApi } from "@/lib/api";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  FileText,
  ClipboardList,
  ChevronLeft,
  Loader2,
} from "lucide-react";

const navItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { path: "/admin/users", label: "Users", icon: Users },
  { path: "/admin/usage", label: "Usage Analytics", icon: BarChart3 },
  { path: "/admin/settings", label: "Settings", icon: Settings },
  { path: "/admin/waitlist", label: "Waitlist", icon: ClipboardList },
  { path: "/admin/audit-logs", label: "Audit Logs", icon: FileText },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, isLoaded: userLoaded } = useUser();
  const { getToken, isLoaded: authLoaded } = useAuth();
  const [tokenReady, setTokenReady] = useState(false);

  // Set auth token for API calls and bootstrap admin
  useEffect(() => {
    const updateToken = async () => {
      if (!authLoaded) return;
      console.log("[Admin] Getting FRESH token from Clerk...");
      // Force a fresh token by passing skipCache: true
      const token = await getToken({ skipCache: true });
      console.log("[Admin] Fresh token received:", token ? `${token.substring(0, 50)}...` : "NULL");

      if (!token) {
        console.error("[Admin] No token available - user may need to sign in again");
        setTokenReady(true);
        return;
      }

      setAuthToken(token);

      // Try to bootstrap admin (will succeed if no admins exist or email is allowlisted)
      try {
        console.log("[Admin] Attempting bootstrap...");
        const result = await adminApi.bootstrap();
        console.log("[Admin] Bootstrap result:", result);
      } catch (err: any) {
        console.log("[Admin] Bootstrap error:", err?.message || err);
        // If token is invalid/expired, don't set tokenReady - let user re-authenticate
        if (err?.message?.includes('expired') || err?.message?.includes('Unauthorized')) {
          console.error("[Admin] Token seems invalid - please sign out and sign in again");
        }
      }

      setTokenReady(true);
    };
    updateToken();

    // Refresh token every 50 seconds (tokens expire after 60 seconds)
    const interval = setInterval(async () => {
      console.log("[Admin] Refreshing token...");
      const token = await getToken({ skipCache: true });
      if (token) {
        console.log("[Admin] Token refreshed");
        setAuthToken(token);
      }
    }, 50000);

    return () => clearInterval(interval);
  }, [getToken, authLoaded]);

  // Show loading while auth is initializing
  if (!authLoaded || !userLoaded || !tokenReady) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading admin panel...</span>
        </div>
      </div>
    );
  }

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return pathname === path;
    return pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-3"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Chat
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 3v18h18" />
              <path d="M7 16l4-8 4 6 3-4" />
            </svg>
            EconChat Admin
          </h1>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                    isActive(item.path, item.exact)
                      ? "bg-blue-600 text-white"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            {user?.imageUrl && (
              <img src={user.imageUrl} alt="" className="w-8 h-8 rounded-full" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.fullName || user?.primaryEmailAddress?.emailAddress}
              </p>
              <p className="text-xs text-gray-400">Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
