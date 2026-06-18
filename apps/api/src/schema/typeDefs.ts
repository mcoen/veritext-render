import { gql } from 'graphql-tag'

export const typeDefs = gql`
  scalar Upload

  enum ConversionStatus {
    PENDING
    PROCESSING
    COMPLETED
    FAILED
  }

  type ConversionJob {
    id: ID!
    userId: String!
    userName: String!
    userEmail: String!
    fileName: String!
    fileType: String!
    fileSizeBytes: Int!
    status: ConversionStatus!
    startedAt: String!
    completedAt: String
    downloadUrl: String
    error: String
  }

  type AuthToken {
    token: String!
    userId: String!
    userName: String!
    userEmail: String!
    expiresAt: String!
  }

  type User {
    id: ID!
    name: String!
    email: String!
    createdAt: String!
  }

  type Query {
    me: User
    conversionJob(id: ID!): ConversionJob
    myConversionJobs: [ConversionJob!]!
    allConversionJobs: [ConversionJob!]!
  }

  type Mutation {
    register(name: String!, email: String!, password: String!): AuthToken!
    login(email: String!, password: String!): AuthToken!
    convertDocument(file: Upload!, fileName: String!): ConversionJob!
    deleteConversionJob(id: ID!): Boolean!
    cancelConversionJob(id: ID!): ConversionJob!
    reprocessConversionJob(id: ID!): ConversionJob!
  }
`
