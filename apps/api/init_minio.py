import json
from minio import Minio

# 这里的账号密码务必填你登录控制台的那套！
client = Minio(
    "127.0.0.1:9000",
    access_key="llm-excel",  
    secret_key="llm-excel",
    secure=False
)

bucket_name = "selgetabel"

# 1. 强制设置公开访问策略
policy = {
    "Version": "2012-10-17",
    "Statement": [{
        "Effect": "Allow",
        "Principal": {"AWS": ["*"]},
        "Action": ["s3:GetBucketLocation", "s3:ListBucket", "s3:GetObject"],
        "Resource": [f"arn:aws:s3:::{bucket_name}", f"arn:aws:s3:::{bucket_name}/*"]
    }]
}
client.set_bucket_policy(bucket_name, json.dumps(policy))
print("✅ 桶公开策略已生效")

# 2. 如果你的 MinIO 版本支持通过 API 设置 CORS (部分版本需在启动参数或 UI 设置)
print("👉 请确保在 MinIO 控制台的 Configuration -> API -> Cors Allow Origin 中填入了 *")