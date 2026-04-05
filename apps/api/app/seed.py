import os

import bcrypt
from sqlalchemy.orm import Session

from app.models import User


def seed_admin(db: Session) -> None:
    admin_email = os.environ.get("ADMIN_EMAIL")
    admin_password = os.environ.get("ADMIN_PASSWORD")

    if not admin_email or not admin_password:
        return

    user_count = db.query(User).count()
    if user_count > 0:
        return

    hashed = bcrypt.hashpw(admin_password.encode(), bcrypt.gensalt()).decode()
    user = User(email=admin_email, hashed_password=hashed)
    db.add(user)
    db.commit()
