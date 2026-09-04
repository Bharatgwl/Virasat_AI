from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import artisans, auth, buyers, cart, dashboard, health, inquiries, orders, products, snaplist, uploads
from app.core.config import get_settings
from app.core.errors import AppError, app_error_handler


settings = get_settings()
app = FastAPI(title=settings.app_name, version="0.4.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_origin_regex=settings.frontend_origin_regex,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)
app.add_exception_handler(AppError, app_error_handler)


@app.middleware("http")
async def limit_ai_request_body(request: Request, call_next):
    if request.url.path == "/api/seller/snaplist/generate":
        raw_length = request.headers.get("content-length")
        if raw_length:
            try:
                content_length = int(raw_length)
            except ValueError:
                return JSONResponse(
                    status_code=400,
                    content={"error": {"code": "INVALID_CONTENT_LENGTH", "message": "Invalid request size header.", "retryable": False}},
                )
            if content_length > settings.ai_max_request_bytes:
                return JSONResponse(
                    status_code=413,
                    content={"error": {"code": "AI_REQUEST_TOO_LARGE", "message": "The combined AI request is too large.", "retryable": False}},
                )
    return await call_next(request)

app.include_router(health.router, prefix="/api")
app.include_router(snaplist.router, prefix="/api")
app.include_router(uploads.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(artisans.router, prefix="/api")
app.include_router(buyers.router, prefix="/api")
app.include_router(products.seller_router, prefix="/api")
app.include_router(products.buyer_router, prefix="/api")
app.include_router(inquiries.seller_router, prefix="/api")
app.include_router(inquiries.buyer_router, prefix="/api")
app.include_router(cart.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
