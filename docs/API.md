# Veritext Render — API Documentation

## Overview

Veritext Render exposes a GraphQL API built with Apollo Server 4 and Express. All document conversion operations, authentication, and job management are handled through a single endpoint.

**Base URL:** `http://localhost:4000`
**GraphQL endpoint:** `POST http://localhost:4000/graphql`
**File downloads:** `GET http://localhost:4000/files/pdfs/{jobId}.pdf`

---

## Authentication

### Getting a Token

Call the `login` or `register` mutation to receive a JWT token valid for 7 days.

### Using the Token

Include the token in the `Authorization` header for all authenticated requests:

```
Authorization: Bearer <your-token>
```

---

## GraphQL Endpoint

**URL:** `POST http://localhost:4000/graphql`
**Content-Type:** `application/json` (for standard queries/mutations)
**Content-Type:** `multipart/form-data` (for file uploads using the GraphQL multipart request spec)

---

## Queries

### `me` — Get current user

Returns the authenticated user's profile.

```graphql
query Me {
  me {
    id
    name
    email
    createdAt
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"query":"query { me { id name email createdAt } }"}'
```

---

### `conversionJob` — Get a single job

```graphql
query ConversionJob($id: ID!) {
  conversionJob(id: $id) {
    id
    fileName
    fileType
    fileSizeBytes
    status
    startedAt
    completedAt
    downloadUrl
    error
  }
}
```

**Variables:**
```json
{ "id": "abc-123" }
```

---

### `myConversionJobs` — Get all jobs for current user

Returns jobs sorted by `startedAt` descending.

```graphql
query MyConversionJobs {
  myConversionJobs {
    id
    fileName
    fileType
    fileSizeBytes
    status
    startedAt
    completedAt
    downloadUrl
    error
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"query":"query { myConversionJobs { id fileName status downloadUrl } }"}'
```

---

### `allConversionJobs` — Get all jobs (any user)

Same shape as `myConversionJobs` but returns jobs from all users. Requires authentication.

```graphql
query AllConversionJobs {
  allConversionJobs {
    id
    userId
    userName
    userEmail
    fileName
    status
    startedAt
    completedAt
    downloadUrl
  }
}
```

---

## Mutations

### `register` — Create a new account

```graphql
mutation Register($name: String!, $email: String!, $password: String!) {
  register(name: $name, email: $email, password: $password) {
    token
    userId
    userName
    userEmail
    expiresAt
  }
}
```

**Variables:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "securepass123"
}
```

**cURL:**
```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation Register($name: String!, $email: String!, $password: String!) { register(name: $name, email: $email, password: $password) { token userId userName userEmail expiresAt } }",
    "variables": { "name": "Jane Smith", "email": "jane@example.com", "password": "securepass123" }
  }'
```

---

### `login` — Authenticate

```graphql
mutation Login($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    token
    userId
    userName
    userEmail
    expiresAt
  }
}
```

**Variables:**
```json
{
  "email": "mcoen@veritext.com",
  "password": "demo1234"
}
```

**cURL:**
```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation Login($email: String!, $password: String!) { login(email: $email, password: $password) { token userId userName userEmail expiresAt } }",
    "variables": { "email": "mcoen@veritext.com", "password": "demo1234" }
  }'
```

**Response:**
```json
{
  "data": {
    "login": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "userId": "user-1",
      "userName": "Matt Coen",
      "userEmail": "mcoen@veritext.com",
      "expiresAt": "2026-06-25T00:00:00.000Z"
    }
  }
}
```

---

### `convertDocument` — Upload and convert a file

This mutation uses the [GraphQL multipart request spec](https://github.com/jaydenseric/graphql-multipart-request-spec). Send a `multipart/form-data` POST with three fields:

| Field | Value |
|-------|-------|
| `operations` | JSON with `query` and `variables` (file variable set to `null`) |
| `map` | JSON mapping file index to variable path |
| `0` | The actual file binary |

```graphql
mutation ConvertDocument($file: Upload!, $fileName: String!) {
  convertDocument(file: $file, fileName: $fileName) {
    id
    status
    fileName
    startedAt
  }
}
```

**cURL (multipart upload):**
```bash
curl -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer <token>" \
  -F 'operations={"query":"mutation ConvertDocument($file: Upload!, $fileName: String!) { convertDocument(file: $file, fileName: $fileName) { id status fileName startedAt } }","variables":{"file":null,"fileName":"report.docx"}}' \
  -F 'map={"0":["variables.file"]}' \
  -F '0=@/path/to/report.docx'
```

**Response:**
```json
{
  "data": {
    "convertDocument": {
      "id": "3f7a1b2c-...",
      "status": "PENDING",
      "fileName": "report.docx",
      "startedAt": "2026-06-18T14:00:00.000Z"
    }
  }
}
```

The conversion runs asynchronously. Poll `myConversionJobs` or `conversionJob(id)` to check status.

---

### `deleteConversionJob` — Delete a job record

```graphql
mutation DeleteConversionJob($id: ID!) {
  deleteConversionJob(id: $id)
}
```

**Variables:**
```json
{ "id": "3f7a1b2c-..." }
```

**cURL:**
```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"query":"mutation DeleteConversionJob($id: ID!) { deleteConversionJob(id: $id) }","variables":{"id":"3f7a1b2c-..."}}'
```

---

## Type Definitions

### `ConversionStatus` enum

| Value | Description |
|-------|-------------|
| `PENDING` | Job created, queued for processing |
| `PROCESSING` | LibreOffice conversion in progress |
| `COMPLETED` | PDF generated and available for download |
| `FAILED` | Conversion failed; see `error` field for details |

### `ConversionJob`

```graphql
type ConversionJob {
  id: ID!
  userId: String!
  userName: String!
  userEmail: String!
  fileName: String!       # Original filename
  fileType: String!       # File extension, e.g. ".docx"
  fileSizeBytes: Int!     # Size of the original file
  status: ConversionStatus!
  startedAt: String!      # ISO 8601 timestamp
  completedAt: String     # ISO 8601 timestamp, null until done
  downloadUrl: String     # null until COMPLETED
  error: String           # null unless FAILED
}
```

### `User`

```graphql
type User {
  id: ID!
  name: String!
  email: String!
  createdAt: String!
}
```

### `AuthToken`

```graphql
type AuthToken {
  token: String!
  userId: String!
  userName: String!
  userEmail: String!
  expiresAt: String!   # ISO 8601 timestamp, 7 days from issue
}
```

---

## Error Codes

| Code | HTTP-equivalent | Description |
|------|-----------------|-------------|
| `UNAUTHENTICATED` | 401 | No token provided, token invalid, or token expired |
| `BAD_USER_INPUT` | 400 | Invalid input (e.g. email already registered, unsupported file type) |
| `FORBIDDEN` | 403 | Authenticated but not authorized (e.g. accessing another user's job) |

Errors are returned in the standard GraphQL error format:
```json
{
  "errors": [
    {
      "message": "Invalid credentials",
      "extensions": { "code": "UNAUTHENTICATED" }
    }
  ]
}
```

---

## File Constraints

- **Maximum file size:** 50 MB
- **Maximum files per request:** 1
- **Supported input types:** `.docx`, `.xlsx`, `.pptx`, `.doc`, `.xls`, `.ppt`, `.odt`, `.ods`, `.odp`, `.rtf`, `.csv`, `.txt`
- **Output format:** PDF only

---

## Async Conversion Flow

Conversion is asynchronous. The flow is:

```
POST convertDocument
  └─> Job created with status: PENDING
      └─> Background process starts
          └─> status: PROCESSING
              ├─> Success → status: COMPLETED, downloadUrl set
              └─> Failure → status: FAILED, error message set
```

**Recommended polling approach:** Call `myConversionJobs` every 3–5 seconds until the job reaches `COMPLETED` or `FAILED`.

---

## Download URLs

Completed PDF files are served as static files:

```
GET http://localhost:4000/files/pdfs/{jobId}.pdf
```

Example:
```bash
curl -O http://localhost:4000/files/pdfs/3f7a1b2c-4d5e-6f7a-8b9c-0d1e2f3a4b5c.pdf
```

No authentication is required to download a file if you have the direct URL.

---

## TypeScript / JavaScript Client Examples

### Login and store token

```typescript
const res = await fetch('http://localhost:4000/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `mutation Login($email: String!, $password: String!) {
      login(email: $email, password: $password) {
        token userId userName userEmail expiresAt
      }
    }`,
    variables: { email: 'mcoen@veritext.com', password: 'demo1234' },
  }),
})
const { data } = await res.json()
const token = data.login.token
localStorage.setItem('token', token)
```

### Upload a file for conversion

```typescript
async function convertFile(file: File, token: string) {
  const body = new FormData()
  body.append('operations', JSON.stringify({
    query: `mutation ConvertDocument($file: Upload!, $fileName: String!) {
      convertDocument(file: $file, fileName: $fileName) {
        id status fileName startedAt
      }
    }`,
    variables: { file: null, fileName: file.name },
  }))
  body.append('map', JSON.stringify({ '0': ['variables.file'] }))
  body.append('0', file, file.name)

  const res = await fetch('http://localhost:4000/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  })
  const { data, errors } = await res.json()
  if (errors) throw new Error(errors[0].message)
  return data.convertDocument
}
```

### Poll for job completion

```typescript
async function waitForCompletion(jobId: string, token: string) {
  while (true) {
    const res = await fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `query ConversionJob($id: ID!) {
          conversionJob(id: $id) { id status downloadUrl error }
        }`,
        variables: { id: jobId },
      }),
    })
    const { data } = await res.json()
    const job = data.conversionJob
    if (job.status === 'COMPLETED') return job.downloadUrl
    if (job.status === 'FAILED') throw new Error(job.error)
    await new Promise(r => setTimeout(r, 3000)) // wait 3s
  }
}
```
