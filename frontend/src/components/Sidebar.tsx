"use client";

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  title: string;
  timestamp: Date;
  messageCount: number;
}

interface SidebarProps {
  currentSessionId: string;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const STORAGE_KEY = 'econchat_messages';
const CONVERSATIONS_KEY = 'econchat_conversations';

export default function Sidebar({
  currentSessionId,
  onNewChat,
  onSelectConversation,
  isOpen,
  onToggle
}: SidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Load conversations from localStorage
  useEffect(() => {
    const loadConversations = () => {
      const savedConversations = localStorage.getItem(CONVERSATIONS_KEY);
      if (savedConversations) {
        try {
          const parsed = JSON.parse(savedConversations);
          setConversations(parsed.map((c: Conversation) => ({
            ...c,
            timestamp: new Date(c.timestamp)
          })));
        } catch {
          setConversations([]);
        }
      }

      // Also check for any session data not in conversations list
      const keys = Object.keys(localStorage).filter(k => k.startsWith(`${STORAGE_KEY}_`));
      const sessionIds = keys.map(k => k.replace(`${STORAGE_KEY}_`, ''));

      setConversations(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        const newConversations: Conversation[] = [];

        sessionIds.forEach(id => {
          if (!existingIds.has(id)) {
            const data = localStorage.getItem(`${STORAGE_KEY}_${id}`);
            if (data) {
              try {
                const messages = JSON.parse(data);
                if (messages.length > 0) {
                  const firstUserMsg = messages.find((m: { role: string; content: string }) => m.role === 'user');
                  newConversations.push({
                    id,
                    title: firstUserMsg ? firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '') : 'New conversation',
                    timestamp: new Date(messages[0]?.timestamp || Date.now()),
                    messageCount: messages.length
                  });
                }
              } catch {
                // Skip invalid data
              }
            }
          }
        });

        if (newConversations.length > 0) {
          const updated = [...prev, ...newConversations].sort((a, b) =>
            b.timestamp.getTime() - a.timestamp.getTime()
          );
          localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(updated));
          return updated;
        }
        return prev;
      });
    };

    loadConversations();
  }, [currentSessionId]);

  // Keyboard shortcut for sidebar toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + B to toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        onToggle();
      }
      // Cmd/Ctrl + N for new chat
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        onNewChat();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onToggle, onNewChat]);

  const deleteConversation = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    localStorage.removeItem(`${STORAGE_KEY}_${id}`);
    setConversations(prev => {
      const updated = prev.filter(c => c.id !== id);
      localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(updated));
      return updated;
    });
    if (id === currentSessionId) {
      onNewChat();
    }
  }, [currentSessionId, onNewChat]);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-[65px] left-0 z-40 h-[calc(100vh-65px)]",
          "w-72 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800",
          "transform transition-transform duration-200 ease-in-out",
          "flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-0 lg:border-0 lg:overflow-hidden"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-800">
          <button
            onClick={onNewChat}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg",
              "bg-wb-blue-600 hover:bg-wb-blue-700 text-white font-medium",
              "transition-colors focus:outline-none focus:ring-2 focus:ring-wb-blue-500 focus:ring-offset-2"
            )}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-2 text-center">
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 rounded text-gray-600 dark:text-slate-300 font-mono">⌘N</kbd>
          </p>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto py-2">
          {conversations.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm text-gray-500 dark:text-slate-400">No conversations yet</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Start a new chat to begin</p>
            </div>
          ) : (
            <ul className="space-y-1 px-2">
              {conversations.map((conv) => (
                <li key={conv.id}>
                  <div
                    onClick={() => onSelectConversation(conv.id)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg transition-colors group cursor-pointer",
                      "hover:bg-gray-100 dark:hover:bg-slate-800",
                      conv.id === currentSessionId && "bg-wb-blue-50 dark:bg-wb-blue-900/30 border-l-2 border-wb-blue-500"
                    )}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && onSelectConversation(conv.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          conv.id === currentSessionId
                            ? "text-wb-blue-700 dark:text-wb-accent-400"
                            : "text-gray-700 dark:text-slate-300"
                        )}>
                          {conv.title}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                          {formatDate(conv.timestamp)} · {conv.messageCount} messages
                        </p>
                      </div>
                      <button
                        onClick={(e) => deleteConversation(e, conv.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-opacity"
                        title="Delete conversation"
                      >
                        <svg className="w-4 h-4 text-gray-400 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer with keyboard shortcuts */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-800 text-xs text-gray-400 dark:text-slate-500">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Toggle sidebar</span>
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 rounded text-gray-600 dark:text-slate-300 font-mono">⌘B</kbd>
            </div>
            <div className="flex justify-between">
              <span>Focus input</span>
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 rounded text-gray-600 dark:text-slate-300 font-mono">⌘K</kbd>
            </div>
            <div className="flex justify-between">
              <span>New chat</span>
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 rounded text-gray-600 dark:text-slate-300 font-mono">⌘N</kbd>
            </div>
          </div>
        </div>
      </aside>

      {/* Toggle button for collapsed sidebar */}
      <button
        onClick={onToggle}
        className={cn(
          "fixed top-20 z-30 p-2 rounded-r-lg transition-all duration-200",
          "bg-white dark:bg-slate-900 border border-l-0 border-gray-200 dark:border-slate-800",
          "hover:bg-gray-50 dark:hover:bg-slate-800",
          "focus:outline-none focus:ring-2 focus:ring-wb-blue-500",
          isOpen ? "left-72" : "left-0"
        )}
        title={isOpen ? "Close sidebar" : "Open sidebar"}
      >
        <svg
          className={cn(
            "w-5 h-5 text-gray-600 dark:text-slate-400 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </>
  );
}
