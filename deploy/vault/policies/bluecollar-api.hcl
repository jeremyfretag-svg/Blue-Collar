# Read secrets
path "kv/data/bluecollar/api" {
  capabilities = ["read", "list"]
}

path "kv/data/bluecollar/database" {
  capabilities = ["read", "list"]
}

path "kv/data/bluecollar/aws" {
  capabilities = ["read", "list"]
}

# Renew token
path "auth/token/renew-self" {
  capabilities = ["update"]
}

# Lookup token
path "auth/token/lookup-self" {
  capabilities = ["read"]
}
