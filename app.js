// State
let API = localStorage.getItem('budgetApi') || '';
let DATA = JSON.parse(localStorage.getItem('budgetData') || 'null');
let catChart = null, dayChart = null;

// Elements
const $ = id => document.getElementById(id);
const monthEl = $('month'), yearEl = $('year');

// Init
document.addEventListener('DOMContentLoaded', init);

function init() {
    // Populate month/year
    const now = new Date();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    monthEl.innerHTML = months.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('');
    yearEl.innerHTML = [2024, 2023, 2022].map(y => `<option value="${y}">${y}</option>`).join('');
    monthEl.value = now.getMonth() + 1;
    yearEl.value = now.getFullYear();
    $('txDate').valueAsDate = now;

    // Events
    $('addBtn').onclick = toggleForm;
    $('cancelBtn').onclick = hideForm;
    $('txForm').onsubmit = addTransaction;
    $('settingsBtn').onclick = showModal;
    $('modalClose').onclick = hideModal;
    $('modalBg').onclick = hideModal;
    $('saveSettings').onclick = saveSettings;
    monthEl.onchange = yearEl.onchange = loadData;

    // Show cached data immediately, then refresh
    if (DATA) {
        render(DATA);
    }

    if (!API) {
        showModal();
        toast('Set your Google Script URL first', 'err');
    } else {
        loadData();
    }
}

function toggleForm() {
    const form = $('formCard');
    const btn = $('addBtn');
    const show = !form.classList.contains('show');
    form.classList.toggle('show', show);
    btn.textContent = show ? '× Cancel' : '+ Add Transaction';
    if (show) $('txDesc').focus();
}

function hideForm() {
    $('formCard').classList.remove('show');
    $('addBtn').textContent = '+ Add Transaction';
    $('txForm').reset();
    $('txDate').valueAsDate = new Date();
}

async function loadData() {
    if (!API) return;
    
    try {
        const m = monthEl.value, y = yearEl.value;
        const res = await fetch(`${API}?action=getAllData&month=${m}&year=${y}`);
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);
        
        DATA = data;
        localStorage.setItem('budgetData', JSON.stringify(data));
        render(data);
    } catch (e) {
        console.error(e);
        toast('Failed to load data', 'err');
    }
}

function render(data) {
    const { categories, transactions, summary } = data;
    
    // Update totals
    $('balance').textContent = `$${summary.balance.toFixed(2)}`;
    $('income').textContent = `+$${summary.totalIncome.toFixed(2)}`;
    $('expenses').textContent = `-$${summary.totalExpenses.toFixed(2)}`;
    
    // Category dropdown
    $('txCat').innerHTML = '<option value="">Category</option>' + 
        categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    
    // Budgets
    const budgetHtml = Object.entries(summary.categorySpending).map(([cat, d]) => {
        const pct = d.budget > 0 ? Math.min((d.spent / d.budget) * 100, 100) : 0;
        const cls = pct > 90 ? 'over' : pct > 75 ? 'warn' : '';
        return `
            <div class="budget-item">
                <div class="budget-head">
                    <span>${cat}</span>
                    <span>$${d.spent.toFixed(0)} / $${d.budget}</span>
                </div>
                <div class="budget-bar">
                    <div class="budget-fill ${cls}" style="width:${pct}%"></div>
                </div>
            </div>`;
    }).join('');
    $('budgets').innerHTML = budgetHtml || '<div class="empty">No budgets set</div>';
    
    // Transactions
    const month = parseInt(monthEl.value), year = parseInt(yearEl.value);
    const filtered = transactions.filter(t => {
        const d = new Date(t.Date);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
    });
    
    if (filtered.length === 0) {
        $('transactions').innerHTML = '<div class="empty">No transactions this month</div>';
    } else {
        $('transactions').innerHTML = filtered.slice(0, 15).map(t => {
            const d = new Date(t.Date);
            const isInc = t.Type === 'Income';
            return `
                <div class="trans-item">
                    <div class="trans-left">
                        <div class="trans-desc">${t.Description}</div>
                        <div class="trans-meta">
                            ${d.toLocaleDateString('en', {month: 'short', day: 'numeric'})}
                            <span class="trans-cat">${t.Category}</span>
                        </div>
                    </div>
                    <div class="trans-right">
                        <span class="trans-amt ${isInc ? 'income' : 'expense'}">${isInc ? '+' : '-'}$${Math.abs(t.Amount).toFixed(2)}</span>
                        <button class="del-btn" onclick="deleteTx(${t.row})">×</button>
                    </div>
                </div>`;
        }).join('');
    }
    
    // Charts
    renderCharts(summary);
    
    // Settings categories
    $('catList').innerHTML = categories.map(c => `
        <div class="cat-item">
            <span>${c.name}</span>
            <input type="number" class="cat-input" value="${c.budget}" 
                   onchange="updateBudget('${c.name}', this.value)">
        </div>`).join('');
}

function renderCharts(summary) {
    const catData = Object.entries(summary.categorySpending).filter(([_, d]) => d.spent > 0);
    const dayData = Object.entries(summary.dailySpending).sort((a, b) => a[0] - b[0]);
    
    // Category chart
    const ctx1 = $('catChart').getContext('2d');
    if (catChart) catChart.destroy();
    
    if (catData.length > 0) {
        catChart = new Chart(ctx1, {
            type: 'doughnut',
            data: {
                labels: catData.map(([c]) => c),
                datasets: [{
                    data: catData.map(([_, d]) => d.spent),
                    backgroundColor: ['#000', '#333', '#555', '#777', '#999', '#bbb', '#ddd'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }
            }
        });
    }
    
    // Daily chart
    const ctx2 = $('dayChart').getContext('2d');
    if (dayChart) dayChart.destroy();
    
    if (dayData.length > 0) {
        dayChart = new Chart(ctx2, {
            type: 'line',
            data: {
                labels: dayData.map(([d]) => d),
                datasets: [{
                    data: dayData.map(([_, v]) => v),
                    borderColor: '#000',
                    backgroundColor: 'rgba(0,0,0,.05)',
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: v => '$' + v }, grid: { color: '#eee' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }
}

async function addTransaction(e) {
    e.preventDefault();
    if (!API) return toast('Configure API URL first', 'err');
    
    const data = {
        date: $('txDate').value,
        category: $('txCat').value,
        description: $('txDesc').value,
        amount: $('txAmt').value,
        type: $('txType').value
    };
    
    // Optimistic UI update
    hideForm();
    toast('Saving...', '');
    
    try {
        await fetch(`${API}?action=addTransaction&data=${encodeURIComponent(JSON.stringify(data))}`);
        toast('Added!', 'ok');
        loadData();
    } catch (e) {
        toast('Failed to add', 'err');
    }
}

async function deleteTx(row) {
    if (!confirm('Delete?')) return;
    
    try {
        await fetch(`${API}?action=deleteTransaction&row=${row}`);
        toast('Deleted', 'ok');
        loadData();
    } catch (e) {
        toast('Failed', 'err');
    }
}

async function updateBudget(cat, budget) {
    try {
        await fetch(`${API}?action=updateBudget&data=${encodeURIComponent(JSON.stringify({ category: cat, budget: parseFloat(budget) }))}`);
        toast('Updated', 'ok');
        loadData();
    } catch (e) {
        toast('Failed', 'err');
    }
}

function showModal() {
    $('modal').classList.add('show');
    $('apiUrl').value = API;
}

function hideModal() {
    $('modal').classList.remove('show');
}

function saveSettings() {
    const url = $('apiUrl').value.trim();
    if (!url) return toast('Enter API URL', 'err');
    
    API = url;
    localStorage.setItem('budgetApi', url);
    hideModal();
    loadData();
    toast('Saved!', 'ok');
}

function toast(msg, type) {
    const old = document.querySelector('.toast');
    if (old) old.remove();
    
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    
    setTimeout(() => t.remove(), 2500);
}