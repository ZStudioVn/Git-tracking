# Troubleshooting Guide

## Common Issues and Solutions

### Installation Issues

#### pnpm install fails
```bash
# Clear cache and retry
pnpm store prune
rm -rf node_modules
pnpm install
```

#### Prisma client generation fails
```bash
# Regenerate Prisma client
pnpm prisma generate
```

### Database Issues

#### Cannot connect to PostgreSQL
1. Check if PostgreSQL is running:
   ```bash
   docker-compose ps
   ```
2. Verify DATABASE_URL in `.env.local`
3. Check PostgreSQL logs:
   ```bash
   docker-compose logs postgres
   ```

#### Migration fails
```bash
# Reset database (WARNING: deletes all data)
pnpm prisma migrate reset

# Or create a new migration
pnpm prisma migrate dev --name fix_issue
```

#### Seed data fails
```bash
# Check seed script errors
pnpm prisma:seed

# If needed, manually reset
pnpm prisma migrate reset --skip-seed
pnpm prisma:seed
```

### GitHub Integration Issues

#### OAuth authentication fails
1. Verify GitHub OAuth App settings
2. Check callback URL matches: `http://localhost:3000/api/auth/callback/github`
3. Ensure GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are correct

#### Rate limit errors
```typescript
// Check rate limit status
const rateLimit = await githubClient.checkRateLimit();
console.log('Remaining:', rateLimit.remaining);
console.log('Reset at:', new Date(rateLimit.reset * 1000));
```

**Solutions:**
- Implement cursor-based pagination
- Cache responses aggressively
- Reduce sync frequency
- Use conditional requests (ETags)

### Build Issues

#### TypeScript errors
```bash
# Check types
pnpm typecheck

# Common fixes:
# 1. Update imports
# 2. Add missing type definitions
# 3. Check Prisma client is generated
```

#### Next.js build fails
```bash
# Clear Next.js cache
rm -rf .next
pnpm build
```

### Runtime Issues

#### Session/Auth not working
1. Check NEXTAUTH_SECRET is set
2. Verify NEXTAUTH_URL matches your domain
3. Clear browser cookies
4. Check browser console for errors

#### Sync jobs stuck
```sql
-- Check job status
SELECT * FROM "SyncJob" WHERE status = 'running' ORDER BY "startedAt" DESC;

-- Reset stuck jobs (use with caution)
UPDATE "SyncJob" SET status = 'failed', error = 'Manually reset' WHERE status = 'running' AND "startedAt" < NOW() - INTERVAL '1 hour';
```

### Testing Issues

#### Tests fail locally but pass in CI
- Check Node.js version matches CI (20 LTS)
- Ensure test database is clean
- Check for timezone issues

#### Coverage below threshold
```bash
# Generate detailed coverage report
pnpm test:coverage
# Open coverage/index.html to see details
```

## Performance Issues

### Slow page loads
1. Check database query performance:
   ```bash
   # Enable Prisma query logging
   # In .env.local: DATABASE_URL="...?connection_limit=10&pool_timeout=20"
   ```
2. Add database indexes
3. Implement pagination
4. Use React.lazy() for code splitting

### Memory leaks
1. Check for unclosed database connections
2. Review event listener cleanup in useEffect
3. Use Chrome DevTools Memory profiler

## Getting Help

If you can't find a solution here:
1. Check open issues on GitHub
2. Create a new issue with:
   - Error message
   - Steps to reproduce
   - Environment details (OS, Node version, etc.)
   - Relevant logs

## Useful Commands

```bash
# View logs
docker-compose logs -f postgres
pnpm dev # (check terminal output)

# Database inspection
pnpm db:studio

# Check environment variables
printenv | grep -E '(DATABASE|GITHUB|NEXTAUTH)'

# Verify API connectivity
curl http://localhost:3000/api/health
```
