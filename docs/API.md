# API Documentation

## Overview

All API routes follow RESTful conventions and return JSON responses.

**Base URL:** `http://localhost:3000/api` (development)

**Authentication:** All routes except `/api/auth/*` require a valid session.

## Common Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
```

## Authentication

### POST /api/auth/signin
GitHub OAuth sign-in (handled by NextAuth.js)

### GET /api/auth/session
Get current user session

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "image": "avatar_url"
  }
}
```

## Repositories

### GET /api/repos
List user's connected repositories

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "repos": [
      {
        "id": "repo_id",
        "name": "repo-name",
        "owner": "owner-name",
        "fullName": "owner/repo",
        "private": false,
        "lastSyncAt": "2026-08-03T10:00:00Z",
        "syncStatus": "completed"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100
    }
  }
}
```

### POST /api/repos
Connect a new repository

**Request Body:**
```json
{
  "owner": "github-username",
  "name": "repo-name"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "repoId": "repo_id",
    "syncJobId": "job_id"
  }
}
```

## Sync

### POST /api/sync
Trigger manual synchronization

**Request Body:**
```json
{
  "repoId": "repo_id",
  "force": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "job_id",
    "status": "queued"
  }
}
```

### GET /api/sync/status
Get sync job status

**Query Parameters:**
- `jobId`: Sync job ID

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "job_id",
    "status": "running",
    "progress": {
      "current": 150,
      "total": 500,
      "percentage": 30
    },
    "startedAt": "2026-08-03T10:00:00Z"
  }
}
```

## Tree

### GET /api/tree
Get file tree for a specific revision

**Query Parameters:**
- `repoId`: Repository ID
- `sha`: Commit SHA or branch name
- `path` (optional): Directory path (default: root)

**Response:**
```json
{
  "success": true,
  "data": {
    "path": "/src",
    "entries": [
      {
        "type": "tree",
        "name": "components",
        "path": "src/components",
        "sha": "tree_sha"
      },
      {
        "type": "blob",
        "name": "index.ts",
        "path": "src/index.ts",
        "sha": "blob_sha",
        "size": 1024
      }
    ]
  }
}
```

## Diff

### GET /api/diff
Compare two revisions

**Query Parameters:**
- `repoId`: Repository ID
- `base`: Base revision (commit SHA or branch)
- `head`: Head revision (commit SHA or branch)
- `path` (optional): Filter by path

**Response:**
```json
{
  "success": true,
  "data": {
    "base": "abc123",
    "head": "def456",
    "files": [
      {
        "path": "src/index.ts",
        "status": "modified",
        "additions": 10,
        "deletions": 5,
        "changes": 15
      }
    ],
    "stats": {
      "totalFiles": 3,
      "additions": 25,
      "deletions": 10
    }
  }
}
```

### GET /api/diff/file
Get line-level diff for a specific file

**Query Parameters:**
- `repoId`: Repository ID
- `base`: Base revision
- `head`: Head revision
- `path`: File path

**Response:**
```json
{
  "success": true,
  "data": {
    "path": "src/index.ts",
    "hunks": [
      {
        "oldStart": 10,
        "oldLines": 5,
        "newStart": 10,
        "newLines": 6,
        "lines": [
          { "type": "context", "content": " existing line" },
          { "type": "deletion", "content": "- removed line" },
          { "type": "addition", "content": "+ added line" }
        ]
      }
    ]
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Invalid request parameters |
| `RATE_LIMIT_EXCEEDED` | GitHub API rate limit exceeded |
| `GITHUB_API_ERROR` | GitHub API error |
| `SYNC_ERROR` | Synchronization failed |
| `INTERNAL_ERROR` | Internal server error |

## Rate Limiting

API routes respect GitHub API rate limits:
- **Authenticated requests:** 5,000 per hour
- **Status updates:** Check headers for remaining quota

Headers returned:
```
X-RateLimit-Remaining: 4999
X-RateLimit-Reset: 1672531200
```
