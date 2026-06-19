output "s3_bucket_name" {
  value = aws_s3_bucket.files.bucket
}

output "dynamodb_users_table" {
  value = aws_dynamodb_table.users.name
}

output "dynamodb_jobs_table" {
  value = aws_dynamodb_table.jobs.name
}

output "app_iam_policy_arn" {
  value = aws_iam_policy.app.arn
}
