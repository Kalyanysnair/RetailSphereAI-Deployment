import os
import sys

# Ensure backend directory is in python sys.path for Vercel Serverless Function runtime
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
backend_dir = os.path.join(root_dir, "backend")

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app as base_app

# ASGI Middleware to restore the original request path from Vercel's x-matched-path header.
# This fixes Vercel's internal rewrite behavior where scope['path'] is rewritten to /api/index.py.
class VercelPathFixMiddleware:
    def __init__(self, asgi_app):
        self.asgi_app = asgi_app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            for name, value in scope.get("headers", []):
                if name.lower() == b"x-matched-path":
                    try:
                        matched_path = value.decode("utf-8").split("?")[0]
                        if matched_path and matched_path != scope.get("path"):
                            scope["path"] = matched_path
                    except Exception:
                        pass
                    break
        await self.asgi_app(scope, receive, send)

app = VercelPathFixMiddleware(base_app)
