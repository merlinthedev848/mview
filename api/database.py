from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
import os

# For development, we'll use SQLite if DATABASE_URL isn't provided (even though docker uses postgres)
# In production, this would be: postgresql+asyncpg://sentinel:sentinel@postgres:5432/sentinelnvr
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./mview.db")

engine = create_async_engine(DATABASE_URL, echo=False)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

from pgvector.sqlalchemy import Vector
from sqlalchemy import text

Base = declarative_base()

# We need to ensure the pgvector extension is created on the postgres database
async def init_vector_db(engine):
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))

async def get_db():
    async with async_session_maker() as session:
        yield session
