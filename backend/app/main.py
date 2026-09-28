from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import auth, admin, production, coupons

# Initialize FastAPI application
# RetailSphere AI Backend Service
app = FastAPI(
    title="RetailSphere AI Backend",
    description="FastAPI Backend for RetailSphere AI E-Commerce & Custom Furniture Platform",
    version="1.0.0"
)

# CORS configuration to allow frontend access from all local ports and origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:4173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:4173",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import Request
from fastapi.responses import JSONResponse
import traceback

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print("=" * 60)
    print(f"[UNHANDLED EXCEPTION] Path: {request.url.path} Method: {request.method}")
    print(f"[UNHANDLED EXCEPTION] Error: {exc}")
    traceback.print_exc()
    print("=" * 60)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"}
    )

# Startup event to auto-create database tables
@app.on_event("startup")
def startup_db():
    try:
        Base.metadata.create_all(bind=engine)
        from sqlalchemy import text
        with engine.connect() as conn:
            try:
                conn.execute(text("ALTER TABLE tbl_users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;"))
                conn.execute(text("ALTER TABLE tbl_users ADD COLUMN IF NOT EXISTS specialization VARCHAR(100);"))
                conn.execute(text("ALTER TABLE tbl_product ADD COLUMN IF NOT EXISTS available_colors TEXT;"))
                
                # Readymade Order completion & staff assignment columns
                conn.execute(text("ALTER TABLE tbl_readymade_order ADD COLUMN IF NOT EXISTS completion_status VARCHAR(100);"))
                conn.execute(text("ALTER TABLE tbl_readymade_order ADD COLUMN IF NOT EXISTS retail_staff_id INT;"))
                
                # Custom Order review & priority columns
                conn.execute(text("ALTER TABLE tbl_custom_order ADD COLUMN IF NOT EXISTS review_status VARCHAR(50) DEFAULT 'NEW';"))
                conn.execute(text("ALTER TABLE tbl_custom_order ADD COLUMN IF NOT EXISTS reviewed_by_id INT;"))
                conn.execute(text("ALTER TABLE tbl_custom_order ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;"))
                conn.execute(text("ALTER TABLE tbl_custom_order ADD COLUMN IF NOT EXISTS review_notes TEXT;"))
                conn.execute(text("ALTER TABLE tbl_custom_order ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'NORMAL';"))

                # Fabrication Request review & priority columns
                conn.execute(text("ALTER TABLE tbl_fabrication_request ADD COLUMN IF NOT EXISTS review_status VARCHAR(50) DEFAULT 'NEW';"))
                conn.execute(text("ALTER TABLE tbl_fabrication_request ADD COLUMN IF NOT EXISTS reviewed_by_id INT;"))
                conn.execute(text("ALTER TABLE tbl_fabrication_request ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;"))
                conn.execute(text("ALTER TABLE tbl_fabrication_request ADD COLUMN IF NOT EXISTS review_notes TEXT;"))
                conn.execute(text("ALTER TABLE tbl_fabrication_request ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'NORMAL';"))

                # Service Request review & priority columns
                conn.execute(text("ALTER TABLE tbl_service_request ADD COLUMN IF NOT EXISTS review_status VARCHAR(50) DEFAULT 'NEW';"))
                conn.execute(text("ALTER TABLE tbl_service_request ADD COLUMN IF NOT EXISTS reviewed_by_id INT;"))
                conn.execute(text("ALTER TABLE tbl_service_request ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;"))
                conn.execute(text("ALTER TABLE tbl_service_request ADD COLUMN IF NOT EXISTS review_notes TEXT;"))
                conn.execute(text("ALTER TABLE tbl_service_request ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'NORMAL';"))

                # Production Stage & Quotation Breakdown migrations
                conn.execute(text("ALTER TABLE tbl_production_stage ADD COLUMN IF NOT EXISTS required_skill VARCHAR(100);"))
                conn.execute(text("ALTER TABLE tbl_quotation_breakdown ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;"))
                conn.execute(text("ALTER TABLE tbl_quotation_breakdown ADD COLUMN IF NOT EXISTS is_latest BOOLEAN DEFAULT TRUE;"))
                conn.execute(text("ALTER TABLE tbl_quotation_breakdown ADD COLUMN IF NOT EXISTS estimated_duration VARCHAR(100);"))
                conn.execute(text("ALTER TABLE tbl_quotation_breakdown ADD COLUMN IF NOT EXISTS estimated_completion_date DATE;"))
                conn.execute(text("ALTER TABLE tbl_quotation_breakdown ADD COLUMN IF NOT EXISTS notes TEXT;"))
                conn.execute(text("ALTER TABLE tbl_quotation_breakdown ADD COLUMN IF NOT EXISTS created_by_id INT;"))
                conn.execute(text("ALTER TABLE tbl_quotation_breakdown ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;"))
                conn.execute(text("ALTER TABLE tbl_quotation_breakdown ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;"))

                # Production Progress migrations
                conn.execute(text("ALTER TABLE tbl_production_progress ADD COLUMN IF NOT EXISTS progress_percentage INT DEFAULT 0;"))
                conn.execute(text("ALTER TABLE tbl_production_progress ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;"))

                conn.commit()
                print("[MIGRATION] Added review metadata, production stage skills, and quotation breakdown columns.")
            except Exception as mig_err:
                print(f"[MIGRATION WARNING] Column migration notice: {mig_err}")
        print("Database tables initialized successfully.")
        from seed_admin import seed_admin_user
        seed_admin_user()
    except Exception as e:
        print(f"Warning: Could not automatically initialize database tables: {e}")

import os
from fastapi.staticfiles import StaticFiles
from app.routers import auth, admin, production, coupons, uploads, materials, fabrication, services, machines, quality, ai_services, fulfillment, retail_staff, fleet, worker_ops, reviews, carrier_portal, delivery_personnel_portal

# Mount static uploads directory safely across local and Vercel environments
def _get_upload_dir() -> str:
    if os.environ.get("VERCEL"):
        upload_path = "/tmp/retailsphere_uploads"
    else:
        upload_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
    try:
        os.makedirs(upload_path, exist_ok=True)
    except OSError:
        import tempfile
        upload_path = os.path.join(tempfile.gettempdir(), "retailsphere_uploads")
        os.makedirs(upload_path, exist_ok=True)
    return upload_path

UPLOAD_DIR = _get_upload_dir()
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Include routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(production.router)
app.include_router(coupons.router)
app.include_router(uploads.router)
app.include_router(materials.router)
app.include_router(fabrication.router)
app.include_router(services.router)
app.include_router(machines.router)
app.include_router(quality.router)
app.include_router(ai_services.router)
app.include_router(fulfillment.router)
app.include_router(retail_staff.router)
app.include_router(fleet.router)
app.include_router(worker_ops.router)
app.include_router(reviews.router)
app.include_router(carrier_portal.router)
app.include_router(delivery_personnel_portal.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "app": "RetailSphere AI Backend",
        "docs": "/docs"
    }
