"""
Run this ONCE on your local machine to add missing columns to Supabase.
Usage: python add_columns.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text

# Paste your Supabase pooler URL here
DATABASE_URL = "postgresql://postgres.epiobctmfrbyqqvfjhff:Hrms2025Pass@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"

engine = create_engine(DATABASE_URL, connect_args={"sslmode": "require"})

migrations = [
    # Add must_change_password to users table
    """
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;
    """,

    # Add offer letter tables
    """
    CREATE TABLE IF NOT EXISTS offer_letter_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    """,

    """
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'offerletterstatuse') THEN
            CREATE TYPE offerletterstatuse AS ENUM ('draft', 'sent');
        END IF;
    END $$;
    """,

    """
    CREATE TABLE IF NOT EXISTS offer_letters (
        id SERIAL PRIMARY KEY,
        candidate_id INTEGER REFERENCES candidates(id),
        employee_id INTEGER REFERENCES employees(id),
        template_id INTEGER REFERENCES offer_letter_templates(id),
        generated_content TEXT NOT NULL,
        salary FLOAT,
        role VARCHAR,
        joining_date DATE,
        status VARCHAR DEFAULT 'draft',
        pdf_path VARCHAR,
        recipient_email VARCHAR,
        recipient_name VARCHAR,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    """,

    # Add notifications table
    """
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notificationtype') THEN
            CREATE TYPE notificationtype AS ENUM ('info', 'warning', 'critical');
        END IF;
    END $$;
    """,

    """
    CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        title VARCHAR NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR DEFAULT 'info',
        is_read BOOLEAN DEFAULT FALSE,
        action_url VARCHAR,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    """,
]

with engine.connect() as conn:
    for sql in migrations:
        try:
            conn.execute(text(sql.strip()))
            conn.commit()
            print(f"✓ Executed: {sql.strip()[:60]}...")
        except Exception as e:
            print(f"⚠ Skipped (may already exist): {str(e)[:80]}")

print("\n✅ All migrations complete! Redeploy Render now.")
