#!/usr/bin/env python3
"""Generate a Fernet key for LLM_SECRET_KEY."""

from cryptography.fernet import Fernet


def main() -> None:
    print(Fernet.generate_key().decode())


if __name__ == "__main__":
    main()
