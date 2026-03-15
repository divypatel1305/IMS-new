window.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (path.includes('dashboard.html')) loadStats();
    if (path.includes('products.html')) loadTableData('products', ['name', 'sku', 'category', 'unit', 'stock']);
    if (path.includes('receipts.html')) loadTableData('receipts', ['date', 'vendor', 'product', 'quantity', 'warehouse']);
    if (path.includes('delivery.html')) loadTableData('deliveries', ['date', 'customer', 'product', 'quantity', 'warehouse']);
    if (path.includes('transfer.html')) loadTableData('transfers', ['date', 'product', 'quantity', 'from_wh', 'to_wh']);
    if (path.includes('history.html')) loadHistory();
});

// Auth Functions
async function handleSignup(e) {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPass').value;
    const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.success) { alert("Registration Successful!"); toggleForms(); }
    else { alert("Email already exists!"); }
}

async function handleLogin(e) {
    e.preventDefault();
    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: document.getElementById('loginEmail').value, password: document.getElementById('loginPass').value })
    });
    if ((await res.json()).success) window.location.href = "dashboard.html";
    else alert("Invalid Credentials!");
}

// Data Loading
async function loadTableData(api, keys) {
    const res = await fetch(`/api/${api}`);
    const data = await res.json();
    const tbody = document.querySelector('tbody');
    if (tbody) tbody.innerHTML = data.map(item => `<tr>${keys.map(k => `<td>${item[k]}</td>`).join('')}</tr>`).join('');
}

async function loadStats() {
    const res = await fetch('/api/stats');
    const d = await res.json();
    document.getElementById('totalP').innerText = d.products;
    document.getElementById('lowStock').innerText = d.lowStock;
    document.getElementById('totalR').innerText = d.receipts;
    document.getElementById('totalD').innerText = d.deliveries;
}

async function loadHistory() {
    const res = await fetch('/api/history');
    const data = await res.json();
    const tbody = document.querySelector('tbody');
    if (tbody) {
        tbody.innerHTML = data.map(h => `
            <tr>
                <td>${h.date}</td>
                <td>${h.product}</td>
                <td style="color:${h.type==='Receipt'?'green':'red'}">${h.quantity}</td>
                <td>${h.warehouse}</td>
                <td><strong>${h.type}</strong></td>
                <td>Recorded</td>
            </tr>`).join('');
    }
}

// Post Functions
async function addProduct() {
    await send('/api/products', { name: 'pName', sku: 'pSku', category: 'pCat', unit: 'pUnit', stock: 'pStock' });
}
async function addReceipt() {
    await send('/api/receipts', { vendor: 'rVendor', product: 'rProduct', quantity: 'rQty', warehouse: 'rWh' }, true);
}
async function addDelivery() {
    await send('/api/deliveries', { customer: 'dCustomer', product: 'dProduct', quantity: 'dQty', warehouse: 'dWh' }, true);
}

async function send(url, mapping, includeDate = false) {
    const body = {};
    for (let key in mapping) body[key] = document.getElementById(mapping[key]).value;
    if (includeDate) body.date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    location.reload();
}