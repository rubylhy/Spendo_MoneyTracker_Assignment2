import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

# Load variables from .env file (Slide 12 - Environment Variables)
load_dotenv()

ca = certifi.where()
MONGO_URL = os.getenv("MONGO_URL")

# Create MongoDB client
client = AsyncIOMotorClient(MONGO_URL, tlsCAFile=ca)
database = client.expense_tracker

# Collections — one for each entity
expenses_collection = database.get_collection("expenses_collection")
users_collection    = database.get_collection("users_collection")
activity_collection = database.get_collection("activity_collection")
