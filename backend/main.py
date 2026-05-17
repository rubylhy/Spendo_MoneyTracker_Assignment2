from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import users, expenses


# ---------------------------------------------------------------
# APPLICATION INITIALIZATION
# ---------------------------------------------------------------

# Create FastAPI application instance
# This acts as the main entry point of the backend
app = FastAPI()


# ---------------------------------------------------------------
# CORS CONFIGURATION
# ---------------------------------------------------------------

# Configure Cross-Origin Resource Sharing (CORS)
# Middleware processes requests before they
# reach application endpoints

# Allows frontend and backend applications
# running on different ports to communicate
app.add_middleware(
    CORSMiddleware,

    # Allows requests from the React
    # development server
    allow_origins=[
        "http://localhost:5173"
    ],

    # Allow all request headers
    allow_headers=["*"],

    # Allow all HTTP methods
    allow_methods=["*"],

    # Allow cookies and authentication data
    allow_credentials=True,
)


# ---------------------------------------------------------------
# ROUTE REGISTRATION
# ---------------------------------------------------------------

# Register application routes
# Routers help separate application features
# into modular files for better organization
app.include_router(users.router)
app.include_router(expenses.router)


# ---------------------------------------------------------------
# ROOT ENDPOINT
# ---------------------------------------------------------------

@app.get("/")
async def root():
    """
    Basic route used to confirm that
    the backend API is active and running.
    """

    return {
        "message": "Spendo API is running"
    }