import os
import sys
import urllib.parse

# Ensure backend directory is in python sys.path for Vercel Serverless Function runtime
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
backend_dir = os.path.join(root_dir, "backend")

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app as base_app

# ASGI Middleware to restore the original request path from Vercel's rewrite query parameter or reverse-proxy headers.
# This fixes Vercel's internal rewrite behavior where scope['path'] is rewritten to /api/index.py.
class VercelPathFixMiddleware:
    def __init__(self, asgi_app):
        self.asgi_app = asgi_app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            headers = dict(scope.get("headers", []))
            path = scope.get("path", "")
            raw_qs = scope.get("query_string", b"").decode("utf-8", errors="ignore")

            # 1. Extract path from __path__ parameter passed by Vercel rewrite (?__path__=$1)
            if "__path__=" in raw_qs:
                params = urllib.parse.parse_qs(raw_qs, keep_blank_values=True)
                if "__path__" in params and params["__path__"]:
                    extracted = params["__path__"][0]
                    # Remove only __path__ from query string, preserving all other query parameters
                    remaining = {k: v for k, v in params.items() if k != "__path__"}
                    scope["query_string"] = urllib.parse.urlencode(remaining, doseq=True).encode("utf-8")

                    if not extracted.startswith("/"):
                        extracted = f"/{extracted}"
                    if not extracted.startswith("/api") and not extracted.startswith("/uploads"):
                        extracted = f"/api{extracted}"
                    path = extracted

            # 2. Extract path from reverse-proxy headers if path is still the entrypoint
            if not path or path in ["/api/index.py", "/api/index", "/index.py", "/api"]:
                for key in [b"x-matched-path", b"x-forwarded-uri", b"x-original-url", b"x-rewrite-url"]:
                    if key in headers:
                        try:
                            raw_val = headers[key].decode("utf-8").split("?")[0]
                            if raw_val and not raw_val.endswith("index.py") and not raw_val.endswith("/api/index"):
                                path = raw_val
                                break
                        except Exception:
                            pass

            # 3. Normalize path if scope['path'] still points to the file entrypoint
            if path in ["/api/index.py", "/api/index", "/index.py"]:
                path = "/api"

            # 4. Clean trailing slashes for docs and openapi (e.g. /docs/ -> /api/docs)
            if path in ["/docs", "/docs/", "/api/docs/"]:
                path = "/api/docs"
            elif path in ["/openapi.json", "/openapi.json/", "/api/openapi.json/"]:
                path = "/api/openapi.json"

            # 5. If path starts with an API section but lacks /api prefix (e.g. /admin/inventory or /auth/me)
            # automatically restore the /api prefix
            api_sections = ["/admin", "/auth", "/production", "/coupons", "/materials", "/fabrication", "/services", "/machines", "/quality", "/ai_services", "/fulfillment", "/retail_staff", "/fleet", "/worker_ops", "/reviews", "/carrier_portal", "/delivery_personnel_portal"]
            for section in api_sections:
                if path.startswith(section):
                    path = f"/api{path}"
                    break

            scope["path"] = path

        await self.asgi_app(scope, receive, send)

app = VercelPathFixMiddleware(base_app)
