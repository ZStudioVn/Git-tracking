/**
 * Next.js middleware — protect /dashboard/* routes. (1D-04)
 * Unauthenticated requests are redirected to the sign-in page.
 */
import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/api/auth/signin',
  },
});

export const config = {
  matcher: ['/dashboard/:path*'],
};
