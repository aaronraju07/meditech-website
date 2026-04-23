from flask import Flask, render_template, request, redirect, session
import sqlite3
import os

print("MAIN FILE RUNNING")

app = Flask(__name__)
app.secret_key = 'secret123'

# ---------------- DATABASE SETUP ----------------


def init_db():
    conn = sqlite3.connect('database.db')
    cur = conn.cursor()

    cur.execute('''
        CREATE TABLE IF NOT EXISTS contact (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT,
            phone TEXT,
            message TEXT
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            description TEXT,
            image TEXT
        )
    ''')

    conn.commit()
    conn.close()


# ---------------- ROUTES ----------------

@app.route('/')
def home():
    return render_template('index.html')


@app.route('/products')
def products():
    conn = sqlite3.connect('database.db')
    cur = conn.cursor()

    cur.execute("SELECT * FROM products")
    data = cur.fetchall()

    conn.close()

    return render_template('products.html', products=data)


@app.route('/trust-center')
def trust():
    return render_template('trust-center.html')


@app.route('/product-details')
def product_details():
    return render_template('product.html')


@app.route('/admin')
def admin():
    if not session.get('admin'):
        return redirect('/login')

    conn = sqlite3.connect('database.db')
    cur = conn.cursor()

    cur.execute("SELECT * FROM contact")
    data = cur.fetchall()

    conn.close()

    return render_template('admin.html', contacts=data)


# ---------------- CONTACT ----------------
@app.route('/contact', methods=['POST'])
def contact():
    name = request.form['name']
    email = request.form['email']
    phone = request.form['phone']
    message = request.form['message']

    conn = sqlite3.connect('database.db')
    cur = conn.cursor()

    cur.execute(
        "INSERT INTO contact (name, email, phone, message) VALUES (?, ?, ?, ?)",
        (name, email, phone, message)
    )

    conn.commit()
    conn.close()

    return redirect('/?success=1')

# ---------------- ADD PRODUCTS ----------------


@app.route('/add')
def add():
    conn = sqlite3.connect('database.db')
    cur = conn.cursor()

    products = [
        ("X-Ray Machine", "Advanced imaging system", "diagnostic-main.jpg"),
        ("Vital Monitor", "Patient monitoring system", "monitoring-main.jpg"),
        ("Laser Scalpel", "Precision surgical tool", "surgical-main.jpg")
    ]

    cur.executemany(
        "INSERT INTO products (name, description, image) VALUES (?, ?, ?)",
        products
    )

    conn.commit()
    conn.close()

    return "Products Added Successfully"


# ---------------- DELETE ----------------
@app.route('/delete/<int:id>')
def delete(id):
    conn = sqlite3.connect('database.db')
    cur = conn.cursor()

    cur.execute("DELETE FROM contact WHERE id = ?", (id,))

    conn.commit()
    conn.close()

    return redirect('/admin')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        if username == 'admin' and password == '1234':
            session['admin'] = True
            return redirect('/admin')
        else:
            return "Invalid credentials"

    return render_template('login.html')


@app.route('/logout')
def logout():
    session.pop('admin', None)
    return redirect('/')


@app.route('/add-product', methods=['GET', 'POST'])
def add_product():
    if not session.get('admin'):
        return redirect('/login')

    if request.method == 'POST':
        name = request.form['name']
        desc = request.form['description']
        image = request.form['image']

        conn = sqlite3.connect('database.db')
        cur = conn.cursor()

        cur.execute(
            "INSERT INTO products (name, description, image) VALUES (?, ?, ?)",
            (name, desc, image)
        )

        conn.commit()
        conn.close()

        return redirect('/products')

    return render_template('add_product.html')


@app.route('/edit-product/<int:id>', methods=['GET', 'POST'])
def edit_product(id):
    if not session.get('admin'):
        return redirect('/login')

    conn = sqlite3.connect('database.db')
    cur = conn.cursor()

    if request.method == 'POST':
        name = request.form['name']
        desc = request.form['description']
        image = request.form['image']

        cur.execute(
            "UPDATE products SET name=?, description=?, image=? WHERE id=?",
            (name, desc, image, id)
        )
        conn.commit()
        conn.close()
        return redirect('/products')

    cur.execute("SELECT * FROM products WHERE id=?", (id,))
    product = cur.fetchone()
    conn.close()

    return render_template('edit_product.html', product=product)

# ---------------- TEST ----------------


@app.route('/test')
def test():
    return "Working"


# ---------------- RUN APP ----------------
if __name__ == '__main__':
    init_db()
    app.run()
