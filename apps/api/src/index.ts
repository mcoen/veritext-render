import express from 'express'
import cors from 'cors'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@as-integrations/express4'
import { graphqlUploadExpress } from 'graphql-upload-ts'
import bodyParser from 'body-parser'
import { typeDefs } from './schema/typeDefs.js'
import { resolvers } from './resolvers/index.js'
import { createContext } from './context.js'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(cors({
  origin: '*',
  allowedHeaders: ['Content-Type', 'Authorization', 'apollo-require-preflight'],
}))
app.use(bodyParser.json())
app.use('/graphql', graphqlUploadExpress({ maxFileSize: 100_000_000, maxFiles: 1 }))

// Serve converted PDF files
const uploadsDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
app.use('/files', express.static(uploadsDir))

const server = new ApolloServer({ typeDefs, resolvers })
await server.start()

app.use('/graphql', expressMiddleware(server, { context: createContext }))

app.get('/', (_req, res) => {
  res.setHeader('Content-Type', 'text/html')
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Veritext Render Service</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      background: #f1f5f9;
      color: #0f172a;
      min-height: 100vh;
      padding: 2rem 1rem;
    }
    .wrap { max-width: 860px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem; }

    /* Header */
    .header {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      padding: 2rem;
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }
    .logo-circle {
      flex-shrink: 0;
      width: 64px; height: 64px;
      border-radius: 50%;
      background: #eff6ff;
      border: 2px solid #38bdf8;
      display: flex; align-items: center; justify-content: center;
    }
    .logo-circle svg { width: 32px; height: 32px; color: #0d3f82; }
    .header-text h1 { font-size: 1.75rem; font-weight: 700; color: #0d3f82; letter-spacing: -0.02em; }
    .header-text p { font-size: 0.875rem; color: #64748b; margin-top: 0.25rem; }
    .badge {
      display: inline-flex; align-items: center; gap: 0.375rem;
      background: #dcfce7; color: #15803d;
      border: 1px solid #bbf7d0;
      border-radius: 9999px;
      padding: 0.25rem 0.75rem;
      font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
      margin-top: 0.5rem;
    }
    .badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #16a34a; animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

    /* Cards */
    .card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      padding: 1.5rem;
    }
    .card h2 {
      font-size: 1rem; font-weight: 700; color: #0f172a;
      text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.75rem;
      color: #64748b; margin-bottom: 1rem;
    }

    /* Endpoint row */
    .endpoint-row {
      display: flex; align-items: flex-start; gap: 1rem;
      padding: 0.875rem 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .endpoint-row:last-child { border-bottom: none; padding-bottom: 0; }
    .endpoint-row:first-of-type { padding-top: 0; }
    .method {
      flex-shrink: 0;
      font-size: 0.7rem; font-weight: 700; font-family: monospace;
      padding: 0.2rem 0.5rem; border-radius: 0.375rem;
      text-transform: uppercase;
    }
    .method.post { background: #fef9c3; color: #854d0e; border: 1px solid #fde68a; }
    .method.get  { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .endpoint-info { min-width: 0; flex: 1; }
    .endpoint-path {
      font-family: monospace; font-size: 0.875rem; font-weight: 600;
      color: #0d3f82;
    }
    .endpoint-path a { color: inherit; text-decoration: none; }
    .endpoint-path a:hover { text-decoration: underline; }
    .endpoint-desc { font-size: 0.8rem; color: #64748b; margin-top: 0.2rem; }

    /* Op accordion */
    .op-item { border-bottom: 1px solid #f1f5f9; }
    .op-item:last-child { border-bottom: none; }
    .op-trigger {
      width: 100%; background: none; border: none; cursor: pointer;
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.875rem 0; text-align: left;
    }
    .op-trigger:hover .op-name { color: #0c86c8; }
    .op-name { font-family: monospace; font-weight: 600; color: #0d3f82; font-size: 0.9rem; flex: 1; }
    .op-type {
      display: inline-block; flex-shrink: 0;
      font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
      padding: 0.15rem 0.4rem; border-radius: 0.25rem;
    }
    .op-type.query    { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .op-type.mutation { background: #fdf4ff; color: #7e22ce; border: 1px solid #e9d5ff; }
    .op-auth { font-size: 0.7rem; font-weight: 600; flex-shrink: 0; }
    .auth-yes { color: #15803d; }
    .auth-no  { color: #94a3b8; }
    .op-chevron { flex-shrink: 0; color: #94a3b8; transition: transform 0.2s; font-size: 0.75rem; }
    .op-item.open .op-chevron { transform: rotate(180deg); }
    .op-desc-short { font-size: 0.8rem; color: #64748b; flex: 2; }

    .op-detail {
      display: none; padding: 0 0 1.25rem 0;
    }
    .op-item.open .op-detail { display: block; }

    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
    @media (max-width: 600px) { .detail-grid { grid-template-columns: 1fr; } }
    .detail-section h4 {
      font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;
      color: #94a3b8; margin-bottom: 0.5rem;
    }
    .arg-row { display: flex; gap: 0.5rem; align-items: baseline; font-size: 0.8rem; margin-bottom: 0.2rem; }
    .arg-name { font-family: monospace; color: #0f172a; font-weight: 500; }
    .arg-type { font-family: monospace; color: #0c86c8; }
    .arg-note { color: #94a3b8; font-size: 0.73rem; }
    .returns { font-family: monospace; font-size: 0.82rem; color: #7e22ce; }

    .example-block { position: relative; }
    .example-block h4 {
      font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;
      color: #94a3b8; margin-bottom: 0.5rem;
    }
    .example-block pre {
      background: #0f172a; color: #e2e8f0; border-radius: 0.625rem;
      padding: 1rem; font-size: 0.75rem; line-height: 1.6;
      overflow-x: auto; font-family: monospace; white-space: pre;
    }
    .copy-btn {
      position: absolute; top: 1.75rem; right: 0.5rem;
      background: #1e293b; border: 1px solid #334155; color: #94a3b8;
      border-radius: 0.375rem; padding: 0.2rem 0.5rem;
      font-size: 0.7rem; cursor: pointer; font-family: monospace;
    }
    .copy-btn:hover { background: #334155; color: #e2e8f0; }
    .kw  { color: #c084fc; }
    .fn  { color: #67e8f9; }
    .str { color: #86efac; }
    .cm  { color: #475569; }

    /* Types */
    .type-block { margin-bottom: 1.25rem; }
    .type-block:last-child { margin-bottom: 0; }
    .type-name {
      font-family: monospace; font-size: 0.875rem; font-weight: 700;
      color: #7e22ce; margin-bottom: 0.5rem;
    }
    .field-list { display: flex; flex-direction: column; gap: 0.25rem; }
    .field-row { display: flex; align-items: baseline; gap: 0.5rem; font-size: 0.8rem; }
    .field-name { font-family: monospace; color: #0f172a; font-weight: 500; min-width: 160px; }
    .field-type { font-family: monospace; color: #0c86c8; }
    .field-note { color: #94a3b8; font-size: 0.75rem; }

    /* Auth box */
    .auth-box {
      background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 0.75rem;
      padding: 1rem 1.25rem; font-size: 0.825rem; color: #1e40af;
      display: flex; gap: 0.75rem; align-items: flex-start;
    }
    .auth-box svg { flex-shrink: 0; margin-top: 1px; }
    code {
      font-family: monospace; background: #f1f5f9; border: 1px solid #e2e8f0;
      border-radius: 0.25rem; padding: 0.1rem 0.35rem; font-size: 0.8rem; color: #0f172a;
    }

    /* Formats */
    .pill-list { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .pill {
      font-family: monospace; font-size: 0.75rem; font-weight: 600;
      background: #f8fafc; border: 1px solid #e2e8f0;
      border-radius: 0.375rem; padding: 0.2rem 0.5rem; color: #475569;
    }

    /* Footer */
    .footer { text-align: center; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.15em; color: #94a3b8; }
  </style>
</head>
<body>
<div class="wrap">

  <!-- Header -->
  <div class="header">
    <div class="logo-circle">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
        <line x1="9" y1="15" x2="15" y2="15"/><line x1="9" y1="11" x2="11" y2="11"/>
      </svg>
    </div>
    <div class="header-text">
      <h1>Veritext Render Service</h1>
      <p>GraphQL microservice for document-to-PDF conversion</p>
      <span class="badge"><span class="badge-dot"></span>Operational</span>
    </div>
  </div>

  <!-- Endpoints -->
  <div class="card">
    <h2>Endpoints</h2>
    <div class="endpoint-row">
      <span class="method post">POST</span>
      <div class="endpoint-info">
        <div class="endpoint-path"><a href="/graphql">/graphql</a></div>
        <div class="endpoint-desc">Primary GraphQL endpoint — queries, mutations, and file uploads (multipart)</div>
      </div>
    </div>
    <div class="endpoint-row">
      <span class="method get">GET</span>
      <div class="endpoint-info">
        <div class="endpoint-path">/files/pdfs/{jobId}.pdf</div>
        <div class="endpoint-desc">Download a converted PDF by job ID</div>
      </div>
    </div>
    <div class="endpoint-row">
      <span class="method get">GET</span>
      <div class="endpoint-info">
        <div class="endpoint-path"><a href="/health">/health</a></div>
        <div class="endpoint-desc">Health check — returns <code>{"status":"ok"}</code></div>
      </div>
    </div>
  </div>

  <!-- Auth -->
  <div class="card">
    <h2>Authentication</h2>
    <div class="auth-box">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      <div>
        All queries and mutations except <code>login</code> and <code>register</code> require a Bearer token.<br/>
        Pass it in the <code>Authorization</code> header:<br/><br/>
        <code>Authorization: Bearer &lt;token&gt;</code><br/><br/>
        Obtain a token via the <code>login</code> or <code>register</code> mutation. Tokens expire after <strong>7 days</strong>.
        File upload requests must also include the header <code>apollo-require-preflight: true</code>.
      </div>
    </div>
  </div>

  <!-- Operations -->
  <div class="card">
    <h2>Operations — click any row to expand</h2>
    <div id="ops">

      <div class="op-item">
        <button class="op-trigger" onclick="toggle(this)">
          <span class="op-name">login</span>
          <span class="op-type mutation">Mutation</span>
          <span class="op-auth auth-no">No auth</span>
          <span class="op-desc-short">Authenticate and receive a JWT token</span>
          <span class="op-chevron">▼</span>
        </button>
        <div class="op-detail">
          <div class="detail-grid">
            <div class="detail-section">
              <h4>Arguments</h4>
              <div class="arg-row"><span class="arg-name">email</span><span class="arg-type">String!</span></div>
              <div class="arg-row"><span class="arg-name">password</span><span class="arg-type">String!</span></div>
            </div>
            <div class="detail-section">
              <h4>Returns</h4>
              <div class="returns">AuthToken!</div>
              <div class="arg-row" style="margin-top:0.4rem"><span class="arg-name">token</span><span class="arg-type">String!</span><span class="arg-note">JWT, 7-day expiry</span></div>
              <div class="arg-row"><span class="arg-name">userId</span><span class="arg-type">String!</span></div>
              <div class="arg-row"><span class="arg-name">userName</span><span class="arg-type">String!</span></div>
              <div class="arg-row"><span class="arg-name">userEmail</span><span class="arg-type">String!</span></div>
              <div class="arg-row"><span class="arg-name">expiresAt</span><span class="arg-type">String!</span></div>
            </div>
          </div>
          <div class="example-block">
            <h4>Example</h4>
            <button class="copy-btn" onclick="copy(this)">copy</button>
            <pre><span class="cm"># POST http://localhost:4000/graphql</span>
<span class="cm"># Content-Type: application/json</span>

<span class="kw">mutation</span> <span class="fn">Login</span> {
  login(
    email: <span class="str">"mcoen@veritext.com"</span>
    password: <span class="str">"demo1234"</span>
  ) {
    token
    userId
    userName
    expiresAt
  }
}</pre>
          </div>
        </div>
      </div>

      <div class="op-item">
        <button class="op-trigger" onclick="toggle(this)">
          <span class="op-name">register</span>
          <span class="op-type mutation">Mutation</span>
          <span class="op-auth auth-no">No auth</span>
          <span class="op-desc-short">Create a new account and receive a JWT token</span>
          <span class="op-chevron">▼</span>
        </button>
        <div class="op-detail">
          <div class="detail-grid">
            <div class="detail-section">
              <h4>Arguments</h4>
              <div class="arg-row"><span class="arg-name">name</span><span class="arg-type">String!</span></div>
              <div class="arg-row"><span class="arg-name">email</span><span class="arg-type">String!</span></div>
              <div class="arg-row"><span class="arg-name">password</span><span class="arg-type">String!</span></div>
            </div>
            <div class="detail-section">
              <h4>Returns</h4>
              <div class="returns">AuthToken!</div>
              <div style="margin-top:0.4rem;font-size:0.8rem;color:#64748b">Same shape as <code>login</code></div>
            </div>
          </div>
          <div class="example-block">
            <h4>Example</h4>
            <button class="copy-btn" onclick="copy(this)">copy</button>
            <pre><span class="kw">mutation</span> <span class="fn">Register</span> {
  register(
    name: <span class="str">"Jane Smith"</span>
    email: <span class="str">"jane@example.com"</span>
    password: <span class="str">"mypassword"</span>
  ) {
    token
    userId
    expiresAt
  }
}</pre>
          </div>
        </div>
      </div>

      <div class="op-item">
        <button class="op-trigger" onclick="toggle(this)">
          <span class="op-name">me</span>
          <span class="op-type query">Query</span>
          <span class="op-auth auth-yes">Auth required</span>
          <span class="op-desc-short">Return the currently authenticated user</span>
          <span class="op-chevron">▼</span>
        </button>
        <div class="op-detail">
          <div class="detail-grid">
            <div class="detail-section">
              <h4>Arguments</h4>
              <div style="font-size:0.8rem;color:#94a3b8">None</div>
            </div>
            <div class="detail-section">
              <h4>Returns</h4>
              <div class="returns">User</div>
              <div class="arg-row" style="margin-top:0.4rem"><span class="arg-name">id</span><span class="arg-type">ID!</span></div>
              <div class="arg-row"><span class="arg-name">name</span><span class="arg-type">String!</span></div>
              <div class="arg-row"><span class="arg-name">email</span><span class="arg-type">String!</span></div>
              <div class="arg-row"><span class="arg-name">createdAt</span><span class="arg-type">String!</span></div>
            </div>
          </div>
          <div class="example-block">
            <h4>Example</h4>
            <button class="copy-btn" onclick="copy(this)">copy</button>
            <pre><span class="cm"># Authorization: Bearer &lt;token&gt;</span>

<span class="kw">query</span> <span class="fn">Me</span> {
  me {
    id
    name
    email
    createdAt
  }
}</pre>
          </div>
        </div>
      </div>

      <div class="op-item">
        <button class="op-trigger" onclick="toggle(this)">
          <span class="op-name">convertDocument</span>
          <span class="op-type mutation">Mutation</span>
          <span class="op-auth auth-yes">Auth required</span>
          <span class="op-desc-short">Upload a file and start async PDF conversion</span>
          <span class="op-chevron">▼</span>
        </button>
        <div class="op-detail">
          <div class="detail-grid">
            <div class="detail-section">
              <h4>Arguments</h4>
              <div class="arg-row"><span class="arg-name">file</span><span class="arg-type">Upload!</span><span class="arg-note">multipart stream</span></div>
              <div class="arg-row"><span class="arg-name">fileName</span><span class="arg-type">String!</span><span class="arg-note">original filename with extension</span></div>
            </div>
            <div class="detail-section">
              <h4>Returns</h4>
              <div class="returns">ConversionJob!</div>
              <div style="margin-top:0.4rem;font-size:0.8rem;color:#64748b">
                Job is returned immediately with <code>status: PENDING</code>.<br/>
                Poll <code>conversionJob(id)</code> or <code>myConversionJobs</code> for updates.
              </div>
            </div>
          </div>
          <div class="example-block">
            <h4>Example (multipart — graphql-multipart-request-spec)</h4>
            <button class="copy-btn" onclick="copy(this)">copy</button>
            <pre><span class="cm"># curl example</span>
curl -X POST http://localhost:4000/graphql \
  -H <span class="str">"Authorization: Bearer &lt;token&gt;"</span> \
  -H <span class="str">"apollo-require-preflight: true"</span> \
  -F <span class="str">'operations={"query":"mutation C($file:Upload!,$fileName:String!){convertDocument(file:$file,fileName:$fileName){id status startedAt}}","variables":{"file":null,"fileName":"report.docx"}}'</span> \
  -F <span class="str">'map={"0":["variables.file"]}'</span> \
  -F <span class="str">'0=@report.docx'</span></pre>
          </div>
        </div>
      </div>

      <div class="op-item">
        <button class="op-trigger" onclick="toggle(this)">
          <span class="op-name">myConversionJobs</span>
          <span class="op-type query">Query</span>
          <span class="op-auth auth-yes">Auth required</span>
          <span class="op-desc-short">List your conversion jobs, newest first</span>
          <span class="op-chevron">▼</span>
        </button>
        <div class="op-detail">
          <div class="detail-grid">
            <div class="detail-section">
              <h4>Arguments</h4>
              <div style="font-size:0.8rem;color:#94a3b8">None</div>
            </div>
            <div class="detail-section">
              <h4>Returns</h4>
              <div class="returns">[ConversionJob!]!</div>
              <div style="margin-top:0.4rem;font-size:0.8rem;color:#64748b">Sorted by <code>startedAt</code> descending. Only jobs owned by the authenticated user.</div>
            </div>
          </div>
          <div class="example-block">
            <h4>Example</h4>
            <button class="copy-btn" onclick="copy(this)">copy</button>
            <pre><span class="kw">query</span> <span class="fn">MyJobs</span> {
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
}</pre>
          </div>
        </div>
      </div>

      <div class="op-item">
        <button class="op-trigger" onclick="toggle(this)">
          <span class="op-name">allConversionJobs</span>
          <span class="op-type query">Query</span>
          <span class="op-auth auth-yes">Auth required</span>
          <span class="op-desc-short">List all jobs across all users, newest first</span>
          <span class="op-chevron">▼</span>
        </button>
        <div class="op-detail">
          <div class="detail-grid">
            <div class="detail-section">
              <h4>Arguments</h4>
              <div style="font-size:0.8rem;color:#94a3b8">None</div>
            </div>
            <div class="detail-section">
              <h4>Returns</h4>
              <div class="returns">[ConversionJob!]!</div>
              <div style="margin-top:0.4rem;font-size:0.8rem;color:#64748b">Includes <code>userName</code> and <code>userEmail</code> for auditing.</div>
            </div>
          </div>
          <div class="example-block">
            <h4>Example</h4>
            <button class="copy-btn" onclick="copy(this)">copy</button>
            <pre><span class="kw">query</span> <span class="fn">AllJobs</span> {
  allConversionJobs {
    id
    userName
    userEmail
    fileName
    status
    startedAt
    completedAt
  }
}</pre>
          </div>
        </div>
      </div>

      <div class="op-item">
        <button class="op-trigger" onclick="toggle(this)">
          <span class="op-name">conversionJob</span>
          <span class="op-type query">Query</span>
          <span class="op-auth auth-yes">Auth required</span>
          <span class="op-desc-short">Fetch a single job by ID (owner only)</span>
          <span class="op-chevron">▼</span>
        </button>
        <div class="op-detail">
          <div class="detail-grid">
            <div class="detail-section">
              <h4>Arguments</h4>
              <div class="arg-row"><span class="arg-name">id</span><span class="arg-type">ID!</span></div>
            </div>
            <div class="detail-section">
              <h4>Returns</h4>
              <div class="returns">ConversionJob</div>
              <div style="margin-top:0.4rem;font-size:0.8rem;color:#64748b">Returns <code>null</code> if not found. Returns <code>FORBIDDEN</code> error if job belongs to another user.</div>
            </div>
          </div>
          <div class="example-block">
            <h4>Example</h4>
            <button class="copy-btn" onclick="copy(this)">copy</button>
            <pre><span class="kw">query</span> <span class="fn">GetJob</span>(<span class="fn">$id</span>: ID!) {
  conversionJob(id: <span class="fn">$id</span>) {
    id
    status
    downloadUrl
    error
    completedAt
  }
}</pre>
          </div>
        </div>
      </div>

      <div class="op-item">
        <button class="op-trigger" onclick="toggle(this)">
          <span class="op-name">cancelConversionJob</span>
          <span class="op-type mutation">Mutation</span>
          <span class="op-auth auth-yes">Auth required</span>
          <span class="op-desc-short">Cancel a PENDING or PROCESSING job</span>
          <span class="op-chevron">▼</span>
        </button>
        <div class="op-detail">
          <div class="detail-grid">
            <div class="detail-section">
              <h4>Arguments</h4>
              <div class="arg-row"><span class="arg-name">id</span><span class="arg-type">ID!</span></div>
            </div>
            <div class="detail-section">
              <h4>Returns</h4>
              <div class="returns">ConversionJob!</div>
              <div style="margin-top:0.4rem;font-size:0.8rem;color:#64748b">
                Job is updated to <code>status: FAILED</code> with <code>error: "Cancelled by user"</code>.<br/>
                Throws if job is already COMPLETED or FAILED.
              </div>
            </div>
          </div>
          <div class="example-block">
            <h4>Example</h4>
            <button class="copy-btn" onclick="copy(this)">copy</button>
            <pre><span class="kw">mutation</span> <span class="fn">Cancel</span>(<span class="fn">$id</span>: ID!) {
  cancelConversionJob(id: <span class="fn">$id</span>) {
    id
    status
    error
    completedAt
  }
}</pre>
          </div>
        </div>
      </div>

      <div class="op-item">
        <button class="op-trigger" onclick="toggle(this)">
          <span class="op-name">reprocessConversionJob</span>
          <span class="op-type mutation">Mutation</span>
          <span class="op-auth auth-yes">Auth required</span>
          <span class="op-desc-short">Retry a FAILED job using the original uploaded file</span>
          <span class="op-chevron">▼</span>
        </button>
        <div class="op-detail">
          <div class="detail-grid">
            <div class="detail-section">
              <h4>Arguments</h4>
              <div class="arg-row"><span class="arg-name">id</span><span class="arg-type">ID!</span></div>
            </div>
            <div class="detail-section">
              <h4>Returns</h4>
              <div class="returns">ConversionJob!</div>
              <div style="margin-top:0.4rem;font-size:0.8rem;color:#64748b">
                Resets job to <code>PENDING</code>, re-runs Gotenberg conversion.<br/>
                Throws if status is not <code>FAILED</code>, or if original file was deleted.
              </div>
            </div>
          </div>
          <div class="example-block">
            <h4>Example</h4>
            <button class="copy-btn" onclick="copy(this)">copy</button>
            <pre><span class="kw">mutation</span> <span class="fn">Reprocess</span>(<span class="fn">$id</span>: ID!) {
  reprocessConversionJob(id: <span class="fn">$id</span>) {
    id
    status
    startedAt
  }
}</pre>
          </div>
        </div>
      </div>

      <div class="op-item">
        <button class="op-trigger" onclick="toggle(this)">
          <span class="op-name">deleteConversionJob</span>
          <span class="op-type mutation">Mutation</span>
          <span class="op-auth auth-yes">Auth required</span>
          <span class="op-desc-short">Permanently remove a job record</span>
          <span class="op-chevron">▼</span>
        </button>
        <div class="op-detail">
          <div class="detail-grid">
            <div class="detail-section">
              <h4>Arguments</h4>
              <div class="arg-row"><span class="arg-name">id</span><span class="arg-type">ID!</span></div>
            </div>
            <div class="detail-section">
              <h4>Returns</h4>
              <div class="returns">Boolean!</div>
              <div style="margin-top:0.4rem;font-size:0.8rem;color:#64748b">Returns <code>true</code> on success. Only the job owner can delete.</div>
            </div>
          </div>
          <div class="example-block">
            <h4>Example</h4>
            <button class="copy-btn" onclick="copy(this)">copy</button>
            <pre><span class="kw">mutation</span> <span class="fn">Delete</span>(<span class="fn">$id</span>: ID!) {
  deleteConversionJob(id: <span class="fn">$id</span>)
}</pre>
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- Types -->
  <div class="card">
    <h2>Key Types</h2>
    <div class="type-block">
      <div class="type-name">ConversionJob</div>
      <div class="field-list">
        <div class="field-row"><span class="field-name">id</span><span class="field-type">ID!</span></div>
        <div class="field-row"><span class="field-name">userId</span><span class="field-type">String!</span></div>
        <div class="field-row"><span class="field-name">userName</span><span class="field-type">String!</span></div>
        <div class="field-row"><span class="field-name">userEmail</span><span class="field-type">String!</span></div>
        <div class="field-row"><span class="field-name">fileName</span><span class="field-type">String!</span></div>
        <div class="field-row"><span class="field-name">fileType</span><span class="field-type">String!</span><span class="field-note">e.g. .docx</span></div>
        <div class="field-row"><span class="field-name">fileSizeBytes</span><span class="field-type">Int!</span></div>
        <div class="field-row"><span class="field-name">status</span><span class="field-type">ConversionStatus!</span><span class="field-note">PENDING | PROCESSING | COMPLETED | FAILED</span></div>
        <div class="field-row"><span class="field-name">startedAt</span><span class="field-type">String!</span><span class="field-note">ISO 8601</span></div>
        <div class="field-row"><span class="field-name">completedAt</span><span class="field-type">String</span><span class="field-note">null while in progress</span></div>
        <div class="field-row"><span class="field-name">downloadUrl</span><span class="field-type">String</span><span class="field-note">set on COMPLETED</span></div>
        <div class="field-row"><span class="field-name">error</span><span class="field-type">String</span><span class="field-note">set on FAILED</span></div>
      </div>
    </div>
    <div class="type-block">
      <div class="type-name">AuthToken</div>
      <div class="field-list">
        <div class="field-row"><span class="field-name">token</span><span class="field-type">String!</span><span class="field-note">JWT, 7-day expiry</span></div>
        <div class="field-row"><span class="field-name">userId</span><span class="field-type">String!</span></div>
        <div class="field-row"><span class="field-name">userName</span><span class="field-type">String!</span></div>
        <div class="field-row"><span class="field-name">userEmail</span><span class="field-type">String!</span></div>
        <div class="field-row"><span class="field-name">expiresAt</span><span class="field-type">String!</span></div>
      </div>
    </div>
  </div>

  <!-- Supported formats -->
  <div class="card">
    <h2>Supported Input Formats</h2>
    <div class="pill-list">
      ${['.docx','.doc','.xlsx','.xls','.pptx','.ppt','.odt','.ods','.odp','.rtf','.csv','.txt','.png','.jpg','.jpeg','.tiff','.tif','.bmp','.gif','.svg','.webp'].map(f => `<span class="pill">${f}</span>`).join('')}
    </div>
    <p style="margin-top:0.75rem;font-size:0.8rem;color:#64748b;">
      All formats are converted to <strong>PDF</strong> via <a href="https://gotenberg.dev" style="color:#0c86c8;">Gotenberg</a>.
      Documents use the LibreOffice route; SVG and WebP use the Chromium route.
      Maximum file size: <strong>100 MB</strong>.
    </p>
  </div>

  <div class="footer">© Veritext Legal Solutions &nbsp;·&nbsp; Veritext Render Service</div>
</div>
<script>
  function toggle(btn) {
    btn.closest('.op-item').classList.toggle('open');
  }
  function copy(btn) {
    const pre = btn.nextElementSibling;
    navigator.clipboard.writeText(pre.innerText).then(() => {
      btn.textContent = 'copied!';
      setTimeout(() => btn.textContent = 'copy', 1500);
    });
  }
</script>
</body>
</html>`)
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

const PORT = process.env.PORT ?? 4000
app.listen(PORT, () => console.log(`🚀 API ready at http://localhost:${PORT}/graphql`))
