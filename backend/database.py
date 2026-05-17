import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os


# ---------------------------------------------------------------
# ENVIRONMENT SETUP
# ---------------------------------------------------------------

# Load variables from the .env file
# Allows sensitive configuration values to remain
# outside the source code
load_dotenv()


# Locate trusted SSL certificates used
# for secure database connections
ca = certifi.where()


# Retrieve MongoDB connection string
# from environment variables
MONGO_URL = os.getenv("MONGO_URL")


# ---------------------------------------------------------------
# DATABASE CONNECTION
# ---------------------------------------------------------------

# Create a secure MongoDB client connection
client = AsyncIOMotorClient(
    MONGO_URL,
    tlsCAFile=ca
)


# Access the database named expense_tracker
database = client.expense_tracker


# ---------------------------------------------------------------
# DATABASE COLLECTIONS
# ---------------------------------------------------------------

# Create references to database collections
# Each collection stores a different type
# of application data

# Stores expense records
expenses_collection = database.get_collection(
    "expenses_collection"
)

# Stores user account information
users_collection = database.get_collection(
    "users_collection"
)

# Stores activity and system logs
activity_collection = database.get_collection(
    "activity_collection"
)