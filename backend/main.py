from fastapi import FastAPI
from app.routes.websocket import router as websocket_router

app = FastAPI()

app.include_router(websocket_router)

@app.get("/")
def home():
    return {"message": "Backend running 🚀"}
