"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-200 dark:bg-slate-800",
        className
      )}
      style={style}
    />
  );
}

// Chat message skeleton
export function MessageSkeleton({ isUser = false }: { isUser?: boolean }) {
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 space-y-2",
          isUser
            ? "bg-wb-blue-100 dark:bg-wb-blue-900/30"
            : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700"
        )}
      >
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
  );
}

// Chart skeleton
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div
      className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4"
      style={{ height }}
    >
      <Skeleton className="h-6 w-48 mb-4" />
      <div className="flex items-end gap-2 h-[calc(100%-40px)]">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end">
            <Skeleton
              className="w-full"
              style={{ height: `${30 + Math.random() * 60}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Table skeleton
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 p-4 bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-28" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 p-4 border-b border-gray-100 dark:border-slate-800 last:border-0"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-28" />
        </div>
      ))}
    </div>
  );
}

// Full chat interface skeleton
export function ChatInterfaceSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <MessageSkeleton />
      <MessageSkeleton isUser />
      <MessageSkeleton />
      <ChartSkeleton />
      <MessageSkeleton isUser />
    </div>
  );
}

// Typing indicator
export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl px-4 py-3">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 bg-gray-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 bg-gray-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 bg-gray-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}
