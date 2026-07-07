import sqlite3
import json
import os

DB_PATH = "campus_copilot.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # Create messages table
    c.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL,
            content TEXT NOT NULL
        )
    ''')
    # Create config/state table
    c.execute('''
        CREATE TABLE IF NOT EXISTS app_state (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

def save_message(role, content):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('INSERT INTO messages (role, content) VALUES (?, ?)', (role, content))
    conn.commit()
    conn.close()

def get_messages():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT role, content FROM messages ORDER BY id ASC')
    rows = c.fetchall()
    conn.close()
    return [{"role": row[0], "content": row[1]} for row in rows]

def clear_messages():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('DELETE FROM messages')
    conn.commit()
    conn.close()

def save_metrics(metrics_dict):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        INSERT INTO app_state (key, value) VALUES ('metrics', ?)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value
    ''', (json.dumps(metrics_dict),))
    conn.commit()
    conn.close()

def get_metrics():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT value FROM app_state WHERE key='metrics'")
    row = c.fetchone()
    conn.close()
    
    if row:
        return json.loads(row[0])
    return {
        "roadmaps_generated": 0,
        "interview_scores": [],
        "resumes_reviewed": 0,
        "skills": {"Python": 0, "System Design": 0, "REST APIs": 0}
    }
