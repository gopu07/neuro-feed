import os
import sys
from sqlalchemy import text
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import SessionLocal

def run_migration():
    print("Initializing social and referrals migration...")
    migration_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "migrations",
        "20260530_social_and_referrals.sql"
    )
    
    if not os.path.exists(migration_path):
        print(f"ERROR: Migration file not found at {migration_path}")
        return

    print(f"Reading migration script from {migration_path}...")
    with open(migration_path, "r", encoding="utf-8") as f:
        sql_content = f.read()

    # Split statements by semicolon to run individually, ignoring comments
    statements = []
    current_statement = []
    
    for line in sql_content.splitlines():
        trimmed = line.strip()
        if not trimmed or trimmed.startswith("--"):
            continue
        
        current_statement.append(line)
        if trimmed.endswith(";"):
            statements.append("\n".join(current_statement))
            current_statement = []

    print(f"Extracted {len(statements)} SQL statements to execute.")
    
    db = SessionLocal()
    try:
        connection = db.connection()
        print("Connected to database. Executing statements...")
        
        for idx, statement in enumerate(statements, 1):
            stmt_clean = statement.strip()
            if not stmt_clean:
                continue
            
            print(f"Executing statement {idx}/{len(statements)}...")
            connection.execute(text(stmt_clean))
            
        db.commit()
        print("SUCCESS: Social and Referrals migration completed successfully!")
        
    except Exception as e:
        db.rollback()
        print("FAILED: Migration aborted due to exception:")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
