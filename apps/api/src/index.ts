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
  <title>Veritext Convert API</title>
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

    /* Op table */
    .op-table { width: 100%; border-collapse: collapse; font-size: 0.825rem; }
    .op-table th {
      text-align: left; font-size: 0.7rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8;
      padding: 0 0.75rem 0.5rem;
    }
    .op-table th:first-child { padding-left: 0; }
    .op-table td { padding: 0.5rem 0.75rem; border-top: 1px solid #f1f5f9; vertical-align: top; }
    .op-table td:first-child { padding-left: 0; }
    .op-table tr:first-child td { border-top: none; }
    .op-name { font-family: monospace; font-weight: 600; color: #0d3f82; }
    .op-type {
      display: inline-block;
      font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
      padding: 0.15rem 0.4rem; border-radius: 0.25rem;
    }
    .op-type.query    { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .op-type.mutation { background: #fdf4ff; color: #7e22ce; border: 1px solid #e9d5ff; }
    .op-auth { font-size: 0.75rem; }
    .auth-yes { color: #15803d; }
    .auth-no  { color: #94a3b8; }
    .op-desc  { color: #475569; }

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
      <h1>Veritext Convert API</h1>
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
    <h2>Operations</h2>
    <table class="op-table">
      <thead>
        <tr>
          <th>Operation</th>
          <th>Type</th>
          <th>Auth</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        <tr><td class="op-name">login</td><td><span class="op-type mutation">Mutation</span></td><td class="op-auth auth-no">No</td><td class="op-desc">Authenticate with email + password, returns JWT token</td></tr>
        <tr><td class="op-name">register</td><td><span class="op-type mutation">Mutation</span></td><td class="op-auth auth-no">No</td><td class="op-desc">Create a new account, returns JWT token</td></tr>
        <tr><td class="op-name">me</td><td><span class="op-type query">Query</span></td><td class="op-auth auth-yes">Yes</td><td class="op-desc">Return the current authenticated user</td></tr>
        <tr><td class="op-name">convertDocument</td><td><span class="op-type mutation">Mutation</span></td><td class="op-auth auth-yes">Yes</td><td class="op-desc">Upload a file and start async PDF conversion; returns job immediately with PENDING status</td></tr>
        <tr><td class="op-name">myConversionJobs</td><td><span class="op-type query">Query</span></td><td class="op-auth auth-yes">Yes</td><td class="op-desc">List all conversion jobs belonging to the current user</td></tr>
        <tr><td class="op-name">allConversionJobs</td><td><span class="op-type query">Query</span></td><td class="op-auth auth-yes">Yes</td><td class="op-desc">List all conversion jobs across all users</td></tr>
        <tr><td class="op-name">conversionJob</td><td><span class="op-type query">Query</span></td><td class="op-auth auth-yes">Yes</td><td class="op-desc">Fetch a single conversion job by ID</td></tr>
        <tr><td class="op-name">cancelConversionJob</td><td><span class="op-type mutation">Mutation</span></td><td class="op-auth auth-yes">Yes</td><td class="op-desc">Cancel a PENDING or PROCESSING job</td></tr>
        <tr><td class="op-name">reprocessConversionJob</td><td><span class="op-type mutation">Mutation</span></td><td class="op-auth auth-yes">Yes</td><td class="op-desc">Retry a FAILED job using the original uploaded file</td></tr>
        <tr><td class="op-name">deleteConversionJob</td><td><span class="op-type mutation">Mutation</span></td><td class="op-auth auth-yes">Yes</td><td class="op-desc">Permanently remove a job record</td></tr>
      </tbody>
    </table>
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
      ${['.docx','.doc','.xlsx','.xls','.pptx','.ppt','.odt','.ods','.odp','.rtf','.csv','.txt'].map(f => `<span class="pill">${f}</span>`).join('')}
    </div>
    <p style="margin-top:0.75rem;font-size:0.8rem;color:#64748b;">
      All formats are converted to <strong>PDF</strong> via <a href="https://gotenberg.dev" style="color:#0c86c8;">Gotenberg</a> (LibreOffice).
      Maximum file size: <strong>100 MB</strong>.
    </p>
  </div>

  <div class="footer">© Veritext Legal Solutions &nbsp;·&nbsp; Veritext Convert API</div>
</div>
</body>
</html>`)
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

const PORT = process.env.PORT ?? 4000
app.listen(PORT, () => console.log(`🚀 API ready at http://localhost:${PORT}/graphql`))
