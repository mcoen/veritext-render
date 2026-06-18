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
app.use(cors({ origin: '*' }))
app.use(graphqlUploadExpress({ maxFileSize: 50_000_000, maxFiles: 1 }))
app.use(bodyParser.json())

// Serve converted PDF files
const uploadsDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
app.use('/files', express.static(uploadsDir))

const server = new ApolloServer({ typeDefs, resolvers })
await server.start()

app.use('/graphql', expressMiddleware(server, { context: createContext }))

const PORT = process.env.PORT ?? 4000
app.listen(PORT, () => console.log(`🚀 API ready at http://localhost:${PORT}/graphql`))
