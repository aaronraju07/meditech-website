import os
import sqlite3
from flask import Flask, render_template, request, redirect, session, abort
from flask_mail import Mail, Message
from flask_wtf.csrf import CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_talisman import Talisman
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

load_dotenv()

print("MAIN FILE RUNNING")

app = Flask(__name__)

# ---------------- SECURITY CONFIG ----------------

app.secret_key = os.environ.get('FLASK_SECRET_KEY')
if not app.secret_key:
    raise RuntimeError("FLASK_SECRET_KEY is not set in your .env file!")

# CSRF protection on all forms
csrf = CSRFProtect(app)

# Rate limiting
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "60 per hour"]
)

# Security headers (clickjacking, MIME sniffing, HTTPS, CSP)
Talisman(app,
    force_https=False,          # Set True when you have SSL in production
    frame_options='DENY',
    content_security_policy={
        'default-src': "'self'",
        'script-src': ["'self'", "'unsafe-inline'"],   # tighten further if possible
        'style-src':  ["'self'", "'unsafe-inline'"],
        'img-src':    ["'self'", "data:"],
        'font-src':   ["'self'"],
    }
)

# ---------------- EMAIL CONFIG ----------------

app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'info.meditechcomponents@gmail.com'
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')   # from .env
app.config['MAIL_DEFAULT_SENDER'] = ('Meditech Components', 'meditechcomponents@gmail.com')

mail = Mail(app)

# Admin credentials loaded from .env and hashed at startup
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', '')
_raw_admin_pw  = os.environ.get('ADMIN_PASSWORD', '')
ADMIN_PASSWORD_HASH = generate_password_hash(_raw_admin_pw) if _raw_admin_pw else None

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'database.db')  # outside web root

# ---------------- DATABASE SETUP ----------------

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cur = conn.cursor()

    cur.execute('''
        CREATE TABLE IF NOT EXISTS contact (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            message TEXT
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            image TEXT
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS quotes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            message TEXT,
            product TEXT,
            source TEXT
        )
    ''')

    conn.commit()
    conn.close()

# ---------------- HELPERS ----------------

def login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('admin'):
            return redirect('/login')
        return f(*args, **kwargs)
    return decorated

def truncate(value, max_len):
    """Hard-cap a string to prevent oversized inputs."""
    return str(value or '')[:max_len]

# ---------------- PUBLIC ROUTES ----------------

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/products')
def products():
    conn = get_db()
    data = conn.execute("SELECT * FROM products").fetchall()
    conn.close()
    return render_template('products.html', products=data)

@app.route('/trust-center')
def trust():
    return render_template('trust-center.html')

@app.route('/product-details')
def product_details():
    return render_template('product.html')

@app.route('/AED_1')
def aed_product():
    return render_template('AED_1.html')

@app.route('/AED_2')
def aed_product2():
    return render_template('AED_2.html')

@app.route('/AED_3')
def aed_product3():
    return render_template('AED_3.html')

@app.route('/strecher1')
def strech():
    return render_template('strecher1.html')

@app.route('/strecher2')
def strech2():
    return render_template('strecher2.html')

@app.route('/strecher3')
def strech3():
    return render_template('strecher3.html')

@app.route('/strecher4')
def strech4():
    return render_template('strecher4.html')

@app.route('/wheelchair1')
def wheelchair1():
    return render_template('wheelchair1.html')

@app.route('/wheelchair2')
def wheelchair2():
    return render_template('wheelchair2.html')

# ---------------- CONTACT ----------------

@app.route('/contact', methods=['POST'])
@limiter.limit("10 per hour")
def contact():
    name    = truncate(request.form.get('name'),    100)
    email   = truncate(request.form.get('email'),   200)
    phone   = truncate(request.form.get('phone'),    20)
    message = truncate(request.form.get('message'), 2000)

    if not name or not email:
        return redirect('/?error=missing_fields')

    conn = get_db()
    conn.execute(
        "INSERT INTO contact (name, email, phone, message) VALUES (?, ?, ?, ?)",
        (name, email, phone, message)
    )
    conn.commit()
    conn.close()

    return redirect('/?success=1')

# ---------------- QUOTE ----------------

@app.route('/submit-quote', methods=['POST'])
@limiter.limit("10 per hour")
def submit_quote():
    name    = truncate(request.form.get('name'),    100)
    email   = truncate(request.form.get('email'),   200)
    phone   = truncate(request.form.get('phone'),    20)
    message = truncate(request.form.get('message'), 2000)
    source  = truncate(request.form.get('source'),  100)

    hidden_list = request.form.get('selected_products_list', '')
    product = truncate(hidden_list if hidden_list.strip() else request.form.get('product', ''), 500)

    if not name or not email:
        return redirect('/?error=missing_fields')

    conn = get_db()
    conn.execute(
        "INSERT INTO quotes (name, email, phone, message, product, source) VALUES (?, ?, ?, ?, ?, ?)",
        (name, email, phone, message, product, source)
    )
    conn.commit()
    conn.close()

    try:
        if 'spec_sheet' in source or 'brochure' in source or 'Documentation' in product:
            request_type = "Technical Documentation & Specification Request"
        elif 'procurement_cart' in source or 'combined-cart' in product:
            request_type = "Multi-Item Procurement Fleet List Quote"
        else:
            request_type = "Commercial Product Quote Inquiry"

        msg = Message(
            subject=f"Inquiry Acknowledgment: {request_type} | Meditech Components",
            recipients=[email],
            cc=['meditechcomponents@gmail.com']
        )

        msg.body = f"""Dear {name},

Thank you for contacting Meditech Components.

We have successfully logged your submission, which has been directed to our commercial division. We appreciate the opportunity to assist with your medical facility's operational requirements.

Please review the summary of your submission below:
----------------------------------------------------------------------
Inquiry Type:      {request_type}
Item(s) Specified: {product}
Contact Registry:  {phone}
Remarks/Notes:     {message if message.strip() else "None provided."}
----------------------------------------------------------------------

An institutional account manager from our sales team has been assigned to your file. We are currently evaluating your specifications and will provide the requested assets or formal pricing data within twenty-four (24) business hours.

If this request is urgent or requires expedited logistics processing, please reply directly to this transmission with your institutional procurement framework data.

Sincerely,

Sales Team
Meditech Components Company
"""
        mail.send(msg)
        print("Email sent successfully!")
    except Exception as e:
        print(f"Email failed to send: {e}")

    return redirect('/?success=1')

# ---------------- ADMIN ----------------

@app.route('/admin')
@login_required
def admin():
    conn = get_db()
    contacts = conn.execute("SELECT * FROM contact").fetchall()
    quotes   = conn.execute("SELECT * FROM quotes").fetchall()
    conn.close()
    return render_template('admin.html', contacts=contacts, quotes=quotes)


# DELETE is now POST only — prevents one-click deletion via link/image tag
@app.route('/delete/<int:id>', methods=['POST'])
@login_required
def delete(id):
    conn = get_db()
    conn.execute("DELETE FROM contact WHERE id = ?", (id,))
    conn.commit()
    conn.close()
    return redirect('/admin')


@app.route('/login', methods=['GET', 'POST'])
@limiter.limit("5 per minute", methods=["POST"])   # brute-force protection
def login():
    if request.method == 'POST':
        username = request.form.get('username', '')
        password = request.form.get('password', '')

        if (
            username == ADMIN_USERNAME
            and ADMIN_PASSWORD_HASH
            and check_password_hash(ADMIN_PASSWORD_HASH, password)
        ):
            session['admin'] = True
            return redirect('/admin')
        else:
            return render_template('login.html', error="Invalid credentials"), 401

    return render_template('login.html')


@app.route('/logout')
def logout():
    session.pop('admin', None)
    return redirect('/')


@app.route('/add-product', methods=['GET', 'POST'])
@login_required
def add_product():
    if request.method == 'POST':
        name  = truncate(request.form.get('name'),        200)
        desc  = truncate(request.form.get('description'), 2000)
        image = truncate(request.form.get('image'),       500)

        conn = get_db()
        conn.execute(
            "INSERT INTO products (name, description, image) VALUES (?, ?, ?)",
            (name, desc, image)
        )
        conn.commit()
        conn.close()
        return redirect('/products')

    return render_template('add_product.html')


@app.route('/edit-product/<int:id>', methods=['GET', 'POST'])
@login_required
def edit_product(id):
    conn = get_db()

    if request.method == 'POST':
        name  = truncate(request.form.get('name'),        200)
        desc  = truncate(request.form.get('description'), 2000)
        image = truncate(request.form.get('image'),       500)

        conn.execute(
            "UPDATE products SET name=?, description=?, image=? WHERE id=?",
            (name, desc, image, id)
        )
        conn.commit()
        conn.close()
        return redirect('/products')

    product = conn.execute("SELECT * FROM products WHERE id=?", (id,)).fetchone()
    conn.close()

    if product is None:
        abort(404)

    return render_template('edit_product.html', product=product)


# ---------------- RUN APP ----------------

if __name__ == '__main__':
    init_db()
    app.run(debug=False)