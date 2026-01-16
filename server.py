import os
import random
from flask import Flask, jsonify, send_from_directory
import psycopg2
from psycopg2.extras import RealDictCursor

app = Flask(__name__, static_folder='.', static_url_path='')

# Database connection URL
DATABASE_URL = "postgresql://postgres:postgres123@localhost:5432/englishlearning?schema=public"

def get_db_connection():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/api/words')
def get_words():
    conn = get_db_connection()
    if not conn:
        # Fallback to hardcoded words if DB fails
        return jsonify([
            { 'word': 'Error', 'translation': '数据库连接失败' },
            { 'word': 'DB', 'translation': 'Database' }
        ])
    
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # Fetch 20 random words
        cur.execute('SELECT word, translation FROM public.vocabularies ORDER BY RANDOM() LIMIT 20')
        rows = cur.fetchall()
        
        # Transform to match our frontend expected format
        words = [{'en': row['word'], 'cn': row['translation']} for row in rows]
        
        cur.close()
        conn.close()
        return jsonify(words)
    except Exception as e:
        print(f"Error executing query: {e}")
        return jsonify([])

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
