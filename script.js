window.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    
    // --- 1. SECURITY CHECK ---
    if (!path.includes('login.html') && path !== '/' && localStorage.getItem("isLoggedIn") !== "true") {
        window.location.replace("login.html");
        return;
    }

    // --- 2. PAGE-SPECIFIC DATA LOADING ---
    if (path.includes('dashboard.html')) loadStats();
    if (path.includes('products.html')) loadTableData('products', ['name', 'sku', 'category', 'unit', 'stock']);
    if (path.includes('receipts.html')) loadTableData('receipts', ['date', 'vendor', 'product', 'quantity', 'warehouse']);
    if (path.includes('delivery.html')) loadTableData('deliveries', ['date', 'customer', 'product', 'quantity', 'warehouse']);
    if (path.includes('warehouse1.html')) loadTableData('warehouses', ['name', 'location', 'manager']);
    if (path.includes('transfer.html')) loadTableData('history', ['date', 'product', 'quantity', 'warehouse']);
    if (path.includes('adjustment.html')) loadTableData('history', ['date', 'product', 'quantity', 'warehouse']);
    if (path.includes('history.html')) loadHistory();

    // --- 3. LOGOUT LOGIC ---
    const logoutBtn = document.getElementById('Logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.replace('login.html');
        });
    }
});

// --- Data Loading Functions ---
async function loadTableData(api, keys) {
    try {
        const res = await fetch(`/api/${api}`);
        let data = await res.json();
        const tbody = document.querySelector('tbody');
        if (!tbody) return;

        // Filtering logic for specific sub-pages that use history data
        if (window.location.pathname.includes('transfer.html')) {
            data = data.filter(item => item.type === 'Transfer');
        }
        if (window.location.pathname.includes('adjustment.html')) {
            data = data.filter(item => item.type && item.type.includes('Adjustment'));
        }

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${keys.length + 1}" style="text-align:center; padding: 20px; color: #94a3b8;">No records found.</td></tr>`;
        } else {
            tbody.innerHTML = data.map(item => `
                <tr>
                    ${keys.map(k => `<td>${item[k] || '-'}</td>`).join('')}
                    <td>
                        <button class="delete-btn" onclick="deleteRecord('${api}', ${item.id})">Delete</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error("Error loading table:", err);
    }
}

// Universal Delete Function
async function deleteRecord(api, id) {
    if (confirm(`Are you sure you want to delete this ${api} entry?`)) {
        try {
            const res = await fetch(`/api/${api}/${id}`, { method: 'DELETE' });
            const result = await res.json();
            if (result.success) {
                location.reload();
            } else {
                alert("Delete failed.");
            }
        } catch (err) {
            console.error(err);
        }
    }
}

async function loadStats() {
    const res = await fetch('/api/stats');
    const d = await res.json();
    if (document.getElementById('totalP')) document.getElementById('totalP').innerText = d.products;
    if (document.getElementById('lowStock')) document.getElementById('lowStock').innerText = d.lowStock;
    if (document.getElementById('totalR')) document.getElementById('totalR').innerText = d.receipts;
    if (document.getElementById('totalD')) document.getElementById('totalD').innerText = d.deliveries;
}

async function loadHistory() {
    const res = await fetch('/api/history');
    const data = await res.json();
    const tbody = document.querySelector('tbody');
    if (tbody) {
        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px; color: #94a3b8;">No history recorded yet</td></tr>`;
        } else {
            tbody.innerHTML = data.map(h => `
                <tr>
                    <td>${h.date}</td>
                    <td>${h.product}</td>
                    <td style="color:${h.type === 'Receipt' ? '#22c55e' : '#ef4444'}">${h.quantity}</td>
                    <td>${h.warehouse}</td>
                    <td><strong>${h.type}</strong></td>
                </tr>`).join('');
        }
    }
}

// --- Action Functions ---
async function addProduct() { await send('/api/products', { name: 'pName', sku: 'pSku', category: 'pCat', unit: 'pUnit', stock: 'pStock' }); }
async function addReceipt() { await send('/api/receipts', { vendor: 'rVendor', product: 'rProduct', quantity: 'rQty', warehouse: 'rWh' }, true); }
async function addDelivery() { await send('/api/deliveries', { customer: 'dCustomer', product: 'dProduct', quantity: 'dQty', warehouse: 'dWh' }, true); }
async function addWarehouse() { await send('/api/warehouses', { name: 'wName', location: 'wLoc', manager: 'wMgr' }); }
async function addTransfer() { await send('/api/transfers', { product: 'tProduct', quantity: 'tQty', from_wh: 'tFrom', to_wh: 'tTo' }, true); }
async function addAdjustment() { await send('/api/adjustments', { product: 'aProduct', warehouse: 'aWh', actual_qty: 'aQty', reason: 'aReason' }, true); }

// --- Helper Function ---
async function send(url, mapping, includeDate = false) {
    const body = {};
    for (let key in mapping) {
        const input = document.getElementById(mapping[key]);
        if (!input || !input.value) { alert("Please fill all fields"); return; }
        body[key] = input.value;
    }
    
    if (includeDate) {
        body.date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    }

    try {
        const res = await fetch(url, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(body) 
        });
        const result = await res.json();
        if (result.success) {
            location.reload();
        } else {
            alert("Action failed. Check if data is valid.");
        }
    } catch (err) {
        console.error(err);
        alert("Server error.");
    }
}