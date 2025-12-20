import type { Metadata } from "next";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";
import { QueryProvider } from "@/components/QueryProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "EconChat - AI Economic Data Assistant",
  description: "AI-powered economic data assistant with World Bank, IMF, FAO, UN Comtrade, and Our World in Data",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        </head>
        <body className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
          <ThemeProvider>
            <QueryProvider>
              {/* Skip to main content for accessibility */}
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-wb-blue-500 text-white px-4 py-2 rounded-lg z-50"
              >
                Skip to main content
              </a>

              {/* Header */}
              <header className="bg-gradient-to-r from-wb-blue-900 to-wb-blue-800 text-white py-4 px-4 md:px-6 shadow-lg sticky top-0 z-40">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                  <Link href="/" className="flex items-center gap-2 md:gap-3 group">
                    <div className="p-2 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors">
                      <svg className="w-6 h-6 md:w-8 md:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 3v18h18"/>
                        <path d="M7 16l4-8 4 6 3-4"/>
                      </svg>
                    </div>
                    <div>
                      <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                        EconChat
                        <span className="text-xs md:text-sm font-medium bg-wb-accent-500/30 text-wb-accent-100 px-2 py-0.5 rounded-full">
                          M-2
                        </span>
                      </h1>
                      <p className="text-wb-accent-200 text-xs md:text-sm hidden sm:block">
                        AI-powered economic data assistant
                      </p>
                    </div>
                  </Link>

                  <div className="flex items-center gap-2 md:gap-4">
                    {/* Data source badges - hidden on mobile */}
                    <div className="hidden lg:flex gap-1.5 text-xs">
                      <span className="bg-white/10 hover:bg-white/20 px-2 py-1 rounded-md transition-colors cursor-help" title="World Bank Development Indicators">
                        WB
                      </span>
                      <span className="bg-white/10 hover:bg-white/20 px-2 py-1 rounded-md transition-colors cursor-help" title="IMF World Economic Outlook">
                        IMF
                      </span>
                      <span className="bg-white/10 hover:bg-white/20 px-2 py-1 rounded-md transition-colors cursor-help" title="FAO FAOSTAT">
                        FAO
                      </span>
                      <span className="bg-white/10 hover:bg-white/20 px-2 py-1 rounded-md transition-colors cursor-help" title="UN Comtrade">
                        Trade
                      </span>
                      <span className="bg-white/10 hover:bg-white/20 px-2 py-1 rounded-md transition-colors cursor-help" title="Our World in Data">
                        OWID
                      </span>
                    </div>

                    {/* Theme toggle */}
                    <ThemeToggle />

                    {/* Auth section */}
                    <SignedOut>
                      <SignInButton mode="modal">
                        <button className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
                          Sign In
                        </button>
                      </SignInButton>
                      <SignUpButton mode="modal">
                        <button className="text-sm bg-wb-accent-500 hover:bg-wb-accent-400 px-3 py-1.5 rounded-lg transition-colors font-medium">
                          Sign Up
                        </button>
                      </SignUpButton>
                    </SignedOut>
                    <SignedIn>
                      <Link
                        href="/admin"
                        className="text-sm text-wb-accent-200 hover:text-white transition-colors hidden md:block"
                      >
                        Admin
                      </Link>
                      <UserButton afterSignOutUrl="/" />
                    </SignedIn>
                  </div>
                </div>
              </header>

              {/* Main content */}
              <main id="main-content" className="flex-1">
                {children}
              </main>

              {/* Footer */}
              <footer className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 py-4 px-4 md:px-6 text-center text-sm text-gray-500 dark:text-slate-400 transition-colors">
                <p className="max-w-4xl mx-auto">
                  Data sources:
                  <span className="hidden sm:inline"> World Bank WDI | IMF WEO | FAO FAOSTAT | UN Comtrade | Our World in Data</span>
                  <span className="sm:hidden"> WB | IMF | FAO | Trade | OWID</span>
                </p>
              </footer>
            </QueryProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
