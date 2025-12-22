"use client";

import { useState, useCallback, useEffect } from "react";
import ChatInterface from "@/components/ChatInterface";
import Sidebar from "@/components/Sidebar";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const [sessionId, setSessionId] = useState(() => `session_${Date.now()}`);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Only access localStorage after mount
  useEffect(() => {
    setMounted(true);
    // Restore sidebar state from localStorage
    const savedState = localStorage.getItem('econchat_sidebar_open');
    if (savedState !== null) {
      setSidebarOpen(JSON.parse(savedState));
    } else {
      // Default: open on desktop, closed on mobile
      setSidebarOpen(window.innerWidth >= 1024);
    }
  }, []);

  // Save sidebar state
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('econchat_sidebar_open', JSON.stringify(sidebarOpen));
    }
  }, [sidebarOpen, mounted]);

  const handleNewChat = useCallback(async () => {
    const newSessionId = `session_${Date.now()}`;

    // Reset backend session
    try {
      const { API_URL } = await import('../config');
      await fetch(`${API_URL}/api/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
    } catch (error) {
      console.error("Failed to reset:", error);
    }

    setSessionId(newSessionId);
  }, [sessionId]);

  const handleSelectConversation = useCallback((id: string) => {
    setSessionId(id);
    // Close sidebar on mobile after selection
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-130px)]">
      <Sidebar
        currentSessionId={sessionId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
      />

      <main
        className={cn(
          "transition-all duration-200 px-4",
          sidebarOpen ? "ml-72" : "ml-0"
        )}
      >
        <div className="max-w-5xl mx-auto">
          <ChatInterface key={sessionId} sessionId={sessionId} />
        </div>
      </main>
    </div>
  );
}
