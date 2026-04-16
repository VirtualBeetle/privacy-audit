import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/social_tenant")
JWT_SECRET: str = os.getenv("JWT_SECRET", "social-demo-secret-change-in-prod")
JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
AUDIT_SERVICE_URL: str = os.getenv("AUDIT_SERVICE_URL", "")
AUDIT_API_KEY: str = os.getenv("AUDIT_API_KEY", "")
AUDIT_TENANT_ID: str = os.getenv("AUDIT_TENANT_ID", "")
DASHBOARD_BASE_URL: str = os.getenv("DASHBOARD_BASE_URL", "http://localhost:3000")
PORT: int = int(os.getenv("PORT", "8082"))
