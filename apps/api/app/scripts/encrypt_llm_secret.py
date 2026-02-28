#!/usr/bin/env python3
"""Encrypt LLM secret value with LLM_SECRET_KEY.

Usage:
  python -m app.scripts.encrypt_llm_secret
  python app/scripts/encrypt_llm_secret.py
"""

import os
import sys
from getpass import getpass

from cryptography.fernet import Fernet


def main() -> int:
    secret_key = os.getenv("LLM_SECRET_KEY")
    if not secret_key:
        print("ERROR: LLM_SECRET_KEY is not set in environment.", file=sys.stderr)
        return 1

    raw_value = getpass("Input raw API key (hidden): ").strip()
    if not raw_value:
        print("ERROR: empty input.", file=sys.stderr)
        return 1

    fernet = Fernet(secret_key.encode())
    encrypted = fernet.encrypt(raw_value.encode()).decode()
    print(encrypted)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
