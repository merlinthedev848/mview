from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from api.config import settings

DATABASE_URL = settings.database_url

engine_kwargs = {
    "echo": settings.db_echo,
    "pool_pre_ping": True,
}
if DATABASE_URL.startswith("postgresql"):
    engine_kwargs.update(
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
    )

engine = create_async_engine(DATABASE_URL, **engine_kwargs)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

from sqlalchemy import text

Base = declarative_base()

# We need to ensure the pgvector extension is created on the postgres database
async def init_vector_db(engine):
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))

async def get_db():
    async with async_session_maker() as session:
        yield session
