from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import users, expenses

app = FastAPI()

# CORS — only allow requests from your React dev server (Slide 10)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite default port
    allow_headers=["*"],
    allow_methods=["*"],
    allow_credentials=True,
)

# Register routers
app.include_router(users.router)
app.include_router(expenses.router)

@app.get("/")
async def root():
    return {"message": "Spendo API is running"}
