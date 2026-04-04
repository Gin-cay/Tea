"""
茶叶助农 · 商城独立 API（MySQL + FastAPI）
启动：在 mall_api 目录执行  python -m uvicorn app.main:app --host 0.0.0.0 --port 8100
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, cart, categories, orders, products, users

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

app = FastAPI(title="茶叶助农·商城 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API = "/api/mall"
app.include_router(categories.router, prefix=API)
app.include_router(products.router, prefix=API)
app.include_router(auth.router, prefix=API)
app.include_router(users.router, prefix=API)
app.include_router(cart.router, prefix=API)
app.include_router(orders.router, prefix=API)


@app.get("/health")
def health():
    return {"ok": True, "service": "tea-mall-api"}
