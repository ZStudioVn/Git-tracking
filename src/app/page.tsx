/**
 * Root page — redirects authenticated users to dashboard,
 * unauthenticated users to login. (D-08: every screen is a URL)
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function HomePage() {
  const session = await auth();
  if (session) {
    redirect('/dashboard');
  } else {
    redirect('/api/auth/signin');
  }
}
