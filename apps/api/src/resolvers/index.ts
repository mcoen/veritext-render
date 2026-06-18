import { authResolvers } from './auth.js'
import { jobResolvers } from './jobs.js'
import { GraphQLUpload } from 'graphql-upload-ts'

export const resolvers = {
  Upload: GraphQLUpload,
  Query: {
    ...jobResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...jobResolvers.Mutation,
  },
}
