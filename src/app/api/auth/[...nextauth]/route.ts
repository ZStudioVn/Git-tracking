/**
 * NextAuth.js API route handler. (1D-02)
 * Auth.js v5 beta — route handler style.
 */
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
