import os
import random
from flask import Flask, jsonify, send_from_directory
import psycopg2
from psycopg2.extras import RealDictCursor

app = Flask(__name__, static_folder='.', static_url_path='')

# Database connection URL
DATABASE_URL = "postgresql://postgres:postgres123@localhost:5432/englishlearning?schema=public"

# 内置备用词库 (当数据库连接失败时使用)
FALLBACK_WORDS = [
    {'en': 'apple', 'cn': '苹果'}, {'en': 'banana', 'cn': '香蕉'},
    {'en': 'orange', 'cn': '橘子'}, {'en': 'grape', 'cn': '葡萄'},
    {'en': 'watermelon', 'cn': '西瓜'}, {'en': 'strawberry', 'cn': '草莓'},
    {'en': 'car', 'cn': '汽车'}, {'en': 'bus', 'cn': '公交车'},
    {'en': 'bicycle', 'cn': '自行车'}, {'en': 'plane', 'cn': '飞机'},
    {'en': 'train', 'cn': '火车'}, {'en': 'dog', 'cn': '狗'},
    {'en': 'cat', 'cn': '猫'}, {'en': 'bird', 'cn': '鸟'},
    {'en': 'fish', 'cn': '鱼'}, {'en': 'elephant', 'cn': '大象'},
    {'en': 'lion', 'cn': '狮子'}, {'en': 'tiger', 'cn': '老虎'},
    {'en': 'monkey', 'cn': '猴子'}, {'en': 'snake', 'cn': '蛇'},
    {'en': 'red', 'cn': '红色'}, {'en': 'blue', 'cn': '蓝色'},
    {'en': 'green', 'cn': '绿色'}, {'en': 'yellow', 'cn': '黄色'},
    {'en': 'black', 'cn': '黑色'}, {'en': 'white', 'cn': '白色'},
    {'en': 'one', 'cn': '一'}, {'en': 'two', 'cn': '二'},
    {'en': 'three', 'cn': '三'}, {'en': 'four', 'cn': '四'},
    {'en': 'five', 'cn': '五'}, {'en': 'six', 'cn': '六'},
    {'en': 'seven', 'cn': '七'}, {'en': 'eight', 'cn': '八'},
    {'en': 'nine', 'cn': '九'}, {'en': 'ten', 'cn': '十'},
    {'en': 'book', 'cn': '书'}, {'en': 'pen', 'cn': '钢笔'},
    {'en': 'pencil', 'cn': '铅笔'}, {'en': 'eraser', 'cn': '橡皮'},
    {'en': 'ruler', 'cn': '尺子'}, {'en': 'school', 'cn': '学校'},
    {'en': 'teacher', 'cn': '老师'}, {'en': 'student', 'cn': '学生'},
    {'en': 'computer', 'cn': '电脑'}, {'en': 'mouse', 'cn': '老鼠/鼠标'},
    {'en': 'keyboard', 'cn': '键盘'}, {'en': 'phone', 'cn': '电话'}
]

def get_db_connection():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        print(f"Warning: Database connection failed: {e}")
        return None

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/api/words')
def get_words():
    conn = get_db_connection()
    
    # 如果数据库连接失败，使用备用词库
    if not conn:
        print("Using fallback word list.")
        # 随机打乱并返回 20 个
        return jsonify(random.sample(FALLBACK_WORDS, min(len(FALLBACK_WORDS), 20)))
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        # Fetch 30 random words
        cur.execute('SELECT word, translation FROM public.vocabularies ORDER BY RANDOM() LIMIT 30')
        rows = cur.fetchall()
        
        if not rows:
            print("Database empty, using fallback list.")
            return jsonify(random.sample(FALLBACK_WORDS, min(len(FALLBACK_WORDS), 20)))

        # Transform to match our frontend expected format
        words = [{'en': row['word'], 'cn': row['translation']} for row in rows]
        
        cur.close()
        conn.close()
        return jsonify(words)
    except Exception as e:
        print(f"Error executing query: {e}")
        # 出错时也返回备用词库
        return jsonify(random.sample(FALLBACK_WORDS, min(len(FALLBACK_WORDS), 20)))

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    # debug=True 可以在代码修改时自动重启，方便调试
    app.run(host='0.0.0.0', port=port, debug=True)
