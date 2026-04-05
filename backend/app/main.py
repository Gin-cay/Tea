"""
茶叶助农 FastAPI 入口：RESTful API、CORS、静态上传目录、启动时建表与 seed。
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.database import Base, SessionLocal, engine
from app.routers import (
    admin_api,
    auth,
    catalog,
    community,
    pay,
    profile,
    public_benefit,
    real_care,
    red_trace,
    shop,
    stories,
    study_quiz,
    trace_chain,
    trace_workflow,
    user_trace,
)
from app.seed import run_seed

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("tea.api")

UPLOAD_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        run_seed(db)
    finally:
        db.close()
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    yield


app = FastAPI(
    title="茶叶助农 API",
    description="微信小程序后端：公益、溯源、商城、认养、社区",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("未处理异常: %s", exc)
    return JSONResponse(status_code=500, content={"detail": "服务器内部错误", "type": type(exc).__name__})


@app.get("/health")
def health():
    return {"ok": True, "service": "tea-fastapi", "version": "2.0.0"}


app.include_router(auth.router)
app.include_router(public_benefit.router)
app.include_router(red_trace.router)
app.include_router(study_quiz.router)
app.include_router(trace_chain.router)
app.include_router(trace_workflow.router)
app.include_router(catalog.router)
app.include_router(pay.router)
app.include_router(community.router)
app.include_router(shop.router)
app.include_router(profile.router)
app.include_router(stories.router)
app.include_router(admin_api.router)
app.include_router(real_care.router)
app.include_router(user_trace.router)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
