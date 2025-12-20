/**
 * Admin Dashboard Layout
 */

import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  FileText,
  ClipboardList,
  LogOut,
  ChevronLeft,
} from 'lucide-react';

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/usage', label: 'Usage Analytics', icon: BarChart3 },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
  { path: '/admin/waitlist', label: 'Waitlist', icon: ClipboardList },
  { path: '/admin/audit-logs', label: 'Audit Logs', icon: FileText },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  const { signOut } = useClerk();

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-3">
            <ChevronLeft className="w-4 h-4" />
            Back to Chat
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                    isActive(item.path, item.exact)
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
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
              <p className="text-sm font-medium truncate">{user?.fullName || user?.primaryEmailAddress?.emailAddress}</p>
              <p className="text-xs text-gray-400">Admin</p>
            </div>
          </div>
          <button
            onClick={() => signOut(() => navigate('/'))}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm w-full"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
