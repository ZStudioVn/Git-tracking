# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of Git-Tracking seriously. If you discover a security vulnerability, please follow these steps:

### Do NOT
- Open a public GitHub issue
- Disclose the vulnerability publicly before it's been addressed

### Do
1. **Email security concerns to:** [Add security email here]
2. **Include in your report:**
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect
- **Acknowledgment:** Within 48 hours
- **Initial assessment:** Within 7 days
- **Fix timeline:** Depends on severity
  - Critical: 1-7 days
  - High: 7-14 days
  - Medium: 14-30 days
  - Low: 30+ days

## Security Best Practices

### For Contributors

#### Credentials and Secrets
- **Never commit secrets** (.env files, API keys, tokens)
- Use `.env.example` for configuration templates
- Store sensitive data in environment variables
- Encrypt tokens at rest using `ENCRYPTION_KEY`

#### Code Review
- All PRs require security review
- Check for SQL injection risks
- Validate all user inputs
- Sanitize outputs (XSS prevention)
- Review authentication/authorization logic

#### Dependencies
- Keep dependencies up to date
- Review security advisories regularly
- Use `pnpm audit` to check for vulnerabilities
- Pin exact versions in production

### For Deployment

#### Environment Security
```bash
# Generate secure secrets
openssl rand -base64 32  # For NEXTAUTH_SECRET
openssl rand -base64 32  # For ENCRYPTION_KEY
```

#### Database Security
- Use connection pooling with limits
- Enable SSL/TLS for database connections
- Apply principle of least privilege for DB users
- Regular backups with encryption

#### API Security
- Session authentication and per-user repository ownership checks are enforced on API routes
- Zod runtime validation is used for repository, Git config, and Git commit inputs
- CSP, frame, MIME-sniffing, referrer, permissions, and production HSTS headers are configured
- GitHub commit writes require an authenticated user, repository ownership, bounded file/path input, and optional expected branch HEAD
- The server never executes user-supplied shell commands and never force-pushes
- Rate limiting is still required before public production deployment
- CORS should be configured explicitly if the API is exposed cross-origin
- Webhook signature verification required

#### GitHub Integration
- Use GitHub App (not personal tokens) in production
- Request minimum required permissions
- Verify webhook signatures
- Rotate tokens periodically
- Monitor for revoked tokens

### Known Security Considerations

#### Git command center
- Local commands are suggestions copied to the user's terminal; they are not executed by the server.
- Browser quick commit uses GitHub's Git Data API and updates only the selected branch with `force: false`.
- `expectedHead` prevents overwriting a branch that changed after the dashboard was loaded.
- File count, path traversal, path-root, message length, and file-size limits are enforced.
- A GitHub App, least-privilege permissions, rate limiting, audit logging, and explicit confirmation are still required for production push workflows.

#### Local project access
- Local project APIs are intended for a localhost-only deployment. Do not expose them through a public reverse proxy.
- Folder paths are resolved with `realpath` before Git inspection and Git commands use `git -C`; no shell interpolation is used.
- The local backend reads Git metadata/status only; it does not upload source files by default.
- Desktop builds use `contextIsolation`, disabled `nodeIntegration`, and a sandboxed renderer; only whitelisted IPC channels are exposed through the preload bridge.
- A future remote/team mode must use a separately authenticated local agent rather than granting the cloud server filesystem access.

#### GitHub API Rate Limits
- Default: 5,000 requests/hour per token
- Mitigation: Cursor-based sync, aggressive caching
- Monitor: Check `X-RateLimit-Remaining` header

#### Token Storage
- Tokens encrypted at rest with AES-256-GCM
- Encryption key stored in environment variable
- Never log full tokens (only last 4 characters)

#### Content Security Policy
```javascript
// Enforced via next.config.js
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';  // Tailwind requires inline styles
img-src 'self' https://avatars.githubusercontent.com data:;
connect-src 'self' https://api.github.com;
frame-ancestors 'none';
```

#### Input Validation
All API routes validate input using:
- Type checking (TypeScript)
- Runtime validation (zod schemas)
- Prisma query parameterization (SQL injection prevention)

#### XSS Prevention
- React escapes output by default
- Never use `dangerouslySetInnerHTML` with untrusted content
- Sanitize all commit messages, PR descriptions, file content
- Use DOMPurify for markdown rendering

## Security Checklist

### Before Deployment
- [ ] All secrets in environment variables
- [ ] Database credentials secured
- [ ] HTTPS enabled
- [ ] CSP headers configured
- [ ] Rate limiting enabled
- [ ] Webhook signature verification active
- [ ] Error messages don't leak sensitive info
- [ ] Logging excludes secrets and PII
- [ ] Dependencies audited (`pnpm audit`)
- [ ] Database backups configured

### Regular Maintenance
- [ ] Monthly dependency updates
- [ ] Quarterly security audit
- [ ] Review access logs
- [ ] Rotate GitHub tokens
- [ ] Update CSP as needed
- [ ] Test disaster recovery

## Vulnerability Disclosure Timeline

1. **Day 0:** Vulnerability reported
2. **Day 2:** Acknowledgment sent
3. **Day 7:** Initial assessment complete
4. **Day 7-30:** Fix developed and tested
5. **Day 30:** Fix deployed
6. **Day 37:** Public disclosure (7 days after fix)

## Hall of Fame

We appreciate security researchers who responsibly disclose vulnerabilities:

<!-- Will be updated as vulnerabilities are reported and fixed -->
- TBD

---

**Last updated:** 2026-08-03
