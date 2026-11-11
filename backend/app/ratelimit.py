"""Shared slowapi limiter, keyed by client IP."""

from slowapi import Limiter
from slowapi.util import get_remote_address

IDEAS_RATE_LIMIT = "10/minute"
SAVED_WRITE_RATE_LIMIT = "30/minute"

limiter = Limiter(key_func=get_remote_address)
