/**
 * NextAuth.js v5 configuration.
 * D-03: GitHub OAuth App for MVP. Upgrade to GitHub App in Phase 5.
 *
 * GitHub OAuth App scopes required for MVP:
 *   - repo (read access to private repos)
 *   - read:user
 *   - read:org (optional, for org repos)
 */
import NextAuth, { type NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/db';
import { encryptToken } from '@/lib/utils/crypto';

const githubClientId = process.env.GITHUB_CLIENT_ID ?? '';
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET ?? '';

export const authOptions: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: githubClientId,
      clientSecret: githubClientSecret,
      authorization: {
        params: {
          scope: 'read:user repo',
        },
      },
    }),
  ],
  callbacks: {
    async signIn() {
      if (!githubClientId || !githubClientSecret) {
        throw new Error('GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are required');
      }
      return true;
    },
    async session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
  events: {
    // Encrypt access token at rest after sign-in (SETUP.md §9)
    async signIn({ account }) {
      if (account?.access_token && account.userId) {
        const encrypted = encryptToken(account.access_token);
        await prisma.account.update({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          data: { access_token: encrypted },
        });
      }
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
