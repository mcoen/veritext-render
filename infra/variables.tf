variable "aws_region" {
  default = "us-east-1"
}

variable "s3_bucket_name" {
  default = "veritext-render-files"
}

variable "dynamodb_users_table" {
  default = "veritext-render-users"
}

variable "dynamodb_jobs_table" {
  default = "veritext-render-jobs"
}
