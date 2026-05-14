import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Connect to Supabase PostgreSQL via connection pooler (port 6543)
# Using the pooler avoids direct connection limits and SSL issues on port 5432.
# The '@' symbol in the password is URL-encoded as '%40'.
db_url = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres.grfjmitpgidzdkxmdhjv:Kethapa%402006@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
)

engine = create_engine(
    db_url,
    connect_args={"sslmode": "require"},
    pool_pre_ping=True,
    pool_recycle=300,
)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
