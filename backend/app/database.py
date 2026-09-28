import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

def init_engine():
    db_url = settings.DATABASE_URL
    is_production = bool(os.environ.get("VERCEL") or os.environ.get("ENVIRONMENT") == "production")

    if db_url:
        # Normalize legacy postgres:// scheme to postgresql:// for SQLAlchemy compatibility
        if db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql://", 1)

        if db_url.startswith("postgresql"):
            try:
                pg_engine = create_engine(
                    db_url,
                    pool_pre_ping=True,
                    connect_args={"connect_timeout": 10}
                )
                with pg_engine.connect() as conn:
                    pass
                print("[DATABASE] Connected to PostgreSQL database successfully.")
                return pg_engine
            except Exception as e:
                if is_production:
                    print(f"[DATABASE ERROR] PostgreSQL connection failed in production/Vercel environment: {e}")
                    raise RuntimeError(
                        f"PostgreSQL database connection failed in production/Vercel environment: {type(e).__name__}. "
                        "Fallback to SQLite is disabled for production. Please verify DATABASE_URL in Vercel settings."
                    ) from e
                print(f"[DATABASE NOTICE] PostgreSQL connection failed ({e}). Falling back to local SQLite database.")
        elif is_production:
            raise RuntimeError(
                "[DATABASE ERROR] DATABASE_URL must start with 'postgresql://' or 'postgres://' in production/Vercel."
            )
    elif is_production:
        raise RuntimeError(
            "[DATABASE ERROR] DATABASE_URL environment variable is required in production/Vercel environment."
        )
    
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    db_path = os.path.join(base_dir, "retailsphere.db").replace("\\", "/")
    sqlite_url = f"sqlite:///{db_path}"
    return create_engine(sqlite_url, connect_args={"check_same_thread": False})

engine = init_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

