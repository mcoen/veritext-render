import { gql } from '@apollo/client'

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      userId
      userName
      userEmail
      expiresAt
    }
  }
`

export const REGISTER = gql`
  mutation Register($name: String!, $email: String!, $password: String!) {
    register(name: $name, email: $email, password: $password) {
      token
      userId
      userName
      userEmail
      expiresAt
    }
  }
`

export const ME = gql`
  query Me {
    me {
      id
      name
      email
      createdAt
    }
  }
`

export const MY_CONVERSION_JOBS = gql`
  query MyConversionJobs {
    myConversionJobs {
      id
      userId
      userName
      userEmail
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
`

export const ALL_CONVERSION_JOBS = gql`
  query AllConversionJobs {
    allConversionJobs {
      id
      userId
      userName
      userEmail
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
`

export const DELETE_JOB = gql`
  mutation DeleteConversionJob($id: ID!) {
    deleteConversionJob(id: $id)
  }
`

export const CANCEL_JOB = gql`
  mutation CancelConversionJob($id: ID!) {
    cancelConversionJob(id: $id) {
      id status completedAt error
    }
  }
`

export const REPROCESS_JOB = gql`
  mutation ReprocessConversionJob($id: ID!) {
    reprocessConversionJob(id: $id) {
      id status startedAt
    }
  }
`
