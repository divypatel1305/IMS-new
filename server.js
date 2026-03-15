const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./database');
const app = express();

app.use(bodyParser.json());
app.use(express.static(__dirname));

// Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));

// --- AUTH APIs ---
app.post('/api/signup', (req, res) => {
    const { email, password } = req.body;
    db.run("INSERT INTO users (email, password) VALUES (?, ?)", [email, password], (err) => {
        if (err) return res.status(400).json({ success: false, message: "Email already exists!" });
        res.json({ success: true });
    });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.get("SELECT * FROM users WHERE email = ? AND password = ?", [email, password], (err, row) => {
        if (row) res.json({ success: true });
        else res.status(401).json({ success: false });
    });
});

// --- INVENTORY APIs ---
app.get('/api/products', (req, res) => db.all("SELECT * FROM products", [], (err, rows) => res.json(rows)));
app.post('/api/products', (req, res) => {
    const { name, sku, category, unit, stock } = req.body;
    db.run("INSERT INTO products (name, sku, category, unit, stock) VALUES (?,?,?,?,?)", [name, sku, category, unit, stock], () => res.json({ success: true }));
});

app.post('/api/receipts', (req, res) => {
    const { vendor, product, quantity, warehouse, date } = req.body;
    db.run("INSERT INTO receipts (vendor, product, quantity, warehouse, date) VALUES (?,?,?,?,?)", [vendor, product, quantity, warehouse, date], () => {
        db.run("UPDATE products SET stock = stock + ? WHERE name = ?", [quantity, product]);
        res.json({ success: true });
    });
});

app.post('/api/deliveries', (req, res) => {
    const { customer, product, quantity, warehouse, date } = req.body;
    db.run("INSERT INTO deliveries (customer, product, quantity, warehouse, date) VALUES (?,?,?,?,?)", [customer, product, quantity, warehouse, date], () => {
        db.run("UPDATE products SET stock = stock - ? WHERE name = ?", [quantity, product]);
        res.json({ success: true });
    });
});

app.post('/api/transfers', (req, res) => {
    const { product, quantity, from_wh, to_wh, date } = req.body;
    db.run("INSERT INTO transfers (product, quantity, from_wh, to_wh, date) VALUES (?,?,?,?,?)", [product, quantity, from_wh, to_wh, date], () => res.json({ success: true }));
});

app.get('/api/history', (req, res) => {
    const sql = `
        SELECT date, product, quantity, warehouse, 'Receipt' as type FROM receipts
        UNION ALL
        SELECT date, product, quantity, warehouse, 'Delivery' as type FROM deliveries
        UNION ALL
        SELECT date, product, quantity, from_wh || ' -> ' || to_wh as warehouse, 'Transfer' as type FROM transfers
        ORDER BY date DESC`;
    db.all(sql, [], (err, rows) => res.json(rows));
});

app.get('/api/stats', (req, res) => {
    db.get("SELECT (SELECT COUNT(*) FROM products) as p, (SELECT COUNT(*) FROM products WHERE stock < 10) as l, (SELECT COUNT(*) FROM receipts) as r, (SELECT COUNT(*) FROM deliveries) as d", (err, row) => {
        res.json({ products: row.p, lowStock: row.l, receipts: row.r, deliveries: row.d });
    });
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));