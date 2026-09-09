import sqlite3
import os

def migrate():
    db_path = 'stations.db'
    if not os.path.exists(db_path):
        print("Database not found.")
        return
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("Initializing VahanSetu Quantum-Level Infrastructure...")
    
    # 1. Financial Layer (VahanPay)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS wallets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE,
            balance REAL DEFAULT 1500.0,
            currency TEXT DEFAULT 'INR',
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            wallet_id INTEGER,
            amount REAL,
            type TEXT, -- 'credit', 'debit'
            description TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 2. Sustainability Economy (Marketplace)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS marketplace_listings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            seller_id INTEGER,
            credits_amount REAL,
            price_inr REAL,
            status TEXT DEFAULT 'active', -- 'active', 'sold', 'cancelled'
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 3. Intelligence Layer (Predictive AI)
    try:
        cursor.execute('ALTER TABLE stations ADD COLUMN predicted_occupancy TEXT')
        print("Added predicted_occupancy to stations.")
    except sqlite3.OperationalError:
        print("predicted_occupancy column already exists.")

    # 4. Personalization (Voice AI)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_settings (
            user_id INTEGER PRIMARY KEY,
            language TEXT DEFAULT 'en-IN',
            voice_enabled INTEGER DEFAULT 1,
            telemetry_visible INTEGER DEFAULT 1
        )
    ''')

    # Initialize wallets for existing users
    cursor.execute('SELECT id FROM users')
    users = cursor.fetchall()
    for (uid,) in users:
        cursor.execute('INSERT OR IGNORE INTO wallets (user_id, balance) VALUES (?, ?)', (uid, 1500.0))

    conn.commit()
    conn.close()
    print("Quantum Migration Successful. Systems Online.")

if __name__ == '__main__':
    migrate()
