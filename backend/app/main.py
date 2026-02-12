from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import create_db_and_tables
from app.routers import funds, holdings, portfolio
from app.scheduler import scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(title="Fund Portfolio Aggregator", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(funds.router)
app.include_router(holdings.router)
app.include_router(portfolio.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
