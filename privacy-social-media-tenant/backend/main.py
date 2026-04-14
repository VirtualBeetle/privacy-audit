import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, users, posts, interactions, checkins, admin, privacy

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="SocialDemo API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(posts.router)
app.include_router(interactions.router)
app.include_router(checkins.router)
app.include_router(admin.router)
app.include_router(privacy.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "social-tenant"}
