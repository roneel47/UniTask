import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { Header } from '@/components/layout/header';
import { AuthProvider } from '@/components/auth/auth-provider';
import { ThemeProvider } from "@/components/theme/theme-provider"; // Import ThemeProvider

export const metadata: Metadata = {
  title: 'UniTask',
  description: 'Task and assignment tracking system for college students',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          GeistSans.variable,
          GeistMono.variable
        )}
      >
        {/* Wrap AuthProvider and children with ThemeProvider */}
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
          <AuthProvider>
            <div className="relative flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">{children}</main>
            </div>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
