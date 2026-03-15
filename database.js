const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./inventory.db');

db.serialize(() => {
    // 1. Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, password TEXT, otp TEXT)`);
    db.run(`INSERT OR IGNORE INTO users (email, password) VALUES ('admin@test.com', 'admin123')`);

    // 2. Products Table
    db.run(`CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, sku TEXT, category TEXT, unit TEXT, stock INTEGER DEFAULT 0)`);

    // 3. Transactions Tables
    db.run(`CREATE TABLE IF NOT EXISTS receipts (id INTEGER PRIMARY KEY AUTOINCREMENT, vendor TEXT, product TEXT, quantity INTEGER, warehouse TEXT, date TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS deliveries (id INTEGER PRIMARY KEY AUTOINCREMENT, customer TEXT, product TEXT, quantity INTEGER, warehouse TEXT, date TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS transfers (id INTEGER PRIMARY KEY AUTOINCREMENT, product TEXT, quantity INTEGER, from_wh TEXT, to_wh TEXT, date TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS adjustments (id INTEGER PRIMARY KEY AUTOINCREMENT, product TEXT, warehouse TEXT, system_qty INTEGER, actual_qty INTEGER, reason TEXT, date TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS warehouses (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, location TEXT, manager TEXT)`);

    console.log("Database Ready!");
});

module.exports = db;