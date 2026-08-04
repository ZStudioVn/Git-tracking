import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { ToastProvider } from '@/components/toast';

export const metadata: Metadata = {
  title: 'Git Tracking',
  description: 'Git tree and change-diff workspace with automatic GitHub synchronization',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
