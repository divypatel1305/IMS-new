const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./database');
const app = express();

app.use(bodyParser.json());

// --- SECURITY: Prevent Back-Button Caching ---
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

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
app.get('/api/products', (req, res) => db.all("SELECT * FROM products", [], (err, rows) => res.json(rows || [])));

app.post('/api/products', (req, res) => {
    const { name, sku, category, unit, stock } = req.body;
    db.run("INSERT INTO products (name, sku, category, unit, stock) VALUES (?,?,?,?,?)", 
    [name, sku, category, unit, stock], (err) => {
        res.json({ success: !err });
    });
});

app.post('/api/receipts', (req, res) => {
    const { vendor, product, quantity, warehouse, date } = req.body;
    // 1. Update Product Stock (Add)
    db.run("UPDATE products SET stock = stock + ? WHERE name = ?", [quantity, product], function(err) {
        if (err) return res.json({ success: false });
        // 2. Insert Receipt Record
        db.run("INSERT INTO receipts (vendor, product, quantity, warehouse, date) VALUES (?, ?, ?, ?, ?)", 
        [vendor, product, quantity, warehouse, date], (err) => {
            res.json({ success: !err });
        });
    });
});

app.post('/api/deliveries', (req, res) => {
    const { customer, product, quantity, warehouse, date } = req.body;
    // 1. Update Product Stock (Subtract)
    db.run("UPDATE products SET stock = stock - ? WHERE name = ?", [quantity, product], function(err) {
        if (err) return res.json({ success: false });
        // 2. Insert Delivery Record
        db.run("INSERT INTO deliveries (customer, product, quantity, warehouse, date) VALUES (?,?,?,?,?)", 
        [customer, product, quantity, warehouse, date], (err) => {
            res.json({ success: !err });
        });
    });
});

app.post('/api/transfers', (req, res) => {
    const { product, quantity, from_wh, to_wh, date } = req.body;
    db.run("INSERT INTO transfers (product, quantity, from_wh, to_wh, date) VALUES (?,?,?,?,?)", 
    [product, quantity, from_wh, to_wh, date], (err) => res.json({ success: !err }));
});

// --- WAREHOUSE APIs ---
app.get('/api/warehouses', (req, res) => db.all("SELECT * FROM warehouses", [], (err, rows) => res.json(rows || [])));

app.post('/api/warehouses', (req, res) => {
    const { name, location, manager } = req.body;
    db.run("INSERT INTO warehouses (name, location, manager) VALUES (?,?,?)", 
    [name, location, manager], (err) => res.json({ success: !err }));
});

// --- UNIVERSAL DELETE ROUTE ---
// This handles products, receipts, deliveries, and warehouses
app.delete('/api/:table/:id', (req, res) => {
    const { table, id } = req.params;
    const validTables = ['products', 'receipts', 'deliveries', 'warehouses', 'transfers', 'adjustments'];
    
    if (!validTables.includes(table)) {
        return res.status(400).json({ success: false, message: "Invalid table" });
    }

    db.run(`DELETE FROM ${table} WHERE id = ?`, [id], (err) => {
        res.json({ success: !err });
    });
});

// --- HISTORY & STATS ---
app.get('/api/history', (req, res) => {
    const sql = `
        SELECT id, date, product, quantity, warehouse, 'Receipt' as type FROM receipts
        UNION ALL
        SELECT id, date, product, quantity, warehouse, 'Delivery' as type FROM deliveries
        UNION ALL
        SELECT id, date, product, quantity, from_wh || ' -> ' || to_wh as warehouse, 'Transfer' as type FROM transfers
        UNION ALL
        SELECT id, date, product, actual_qty as quantity, warehouse, 'Adjustment (' || reason || ')' as type FROM adjustments
        ORDER BY date DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("History Error:", err.message);
            return res.json([]);
        }
        res.json(rows || []);
    });
});

app.get('/api/stats', (req, res) => {
    db.get("SELECT (SELECT COUNT(*) FROM products) as p, (SELECT COUNT(*) FROM products WHERE stock < 10) as l, (SELECT COUNT(*) FROM receipts) as r, (SELECT COUNT(*) FROM deliveries) as d", (err, row) => {
        res.json({ products: row?.p || 0, lowStock: row?.l || 0, receipts: row?.r || 0, deliveries: row?.d || 0 });
    });
});

app.post('/api/adjustments', (req, res) => {
    const { product, warehouse, actual_qty, reason, date } = req.body;
    db.run("UPDATE products SET stock = ? WHERE name = ?", [actual_qty, product], (err) => {
        if (!err) {
            db.run("INSERT INTO adjustments (product, warehouse, actual_qty, reason, date) VALUES (?,?,?,?,?)", 
            [product, warehouse, actual_qty, reason, date]);
            res.json({ success: true });
        } else {
            res.json({ success: false });
        }
    });
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));