"""Shared configuration and database connection for ETL scripts."""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

ETL_DIR = Path(__file__).parent
LOG_DIR = ETL_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

# Valid region values matching the database CHECK constraint.
VALID_REGIONS = frozenset(
    [
        "Africa",
        "Americas",
        "Central Eurasia",
        "East Asia",
        "Europe",
        "Middle East and North Africa",
        "Oceania-Pacific",
        "South Asia",
        "Southeast Asia",
    ]
)

VALID_CATEGORIES = frozenset(
    ["social_complexity", "warfare", "religion", "agriculture"]
)

VALID_CONFIDENCE = frozenset(
    [
        "present",
        "absent",
        "inferred_present",
        "inferred_absent",
        "suspected_present",
        "suspected_absent",
        "unknown",
    ]
)


def get_supabase_client() -> Client:
    """Create and return an authenticated Supabase client."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise EnvironmentError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set. "
            "Copy .env.example to .env and fill in your credentials."
        )
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def setup_logger(name: str) -> logging.Logger:
    """Create a logger that writes to both console and a log file."""
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    if logger.handlers:
        return logger

    formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
    )

    console = logging.StreamHandler()
    console.setFormatter(formatter)
    logger.addHandler(console)

    file_handler = logging.FileHandler(LOG_DIR / f"{name}.log")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    return logger
