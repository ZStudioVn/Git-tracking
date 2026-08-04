/**
 * Next.js middleware — protect /dashboard/* routes. (1D-04)
 * Unauthenticated requests are redirected to the sign-in page.
 */
import { auth } from '@/lib/auth';

export default auth((request) => {
  if (!request.auth) {
    const signInUrl = new URL('/api/auth/signin', request.nextUrl.origin);
    signInUrl.searchParams.set('callbackUrl', request.nextUrl.href);
    return Response.redirect(signInUrl);
  }
  return undefined;
});

export const config = {
  matcher: ['/dashboard/:path*'],
};
