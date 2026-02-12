// State
let API = localStorage.getItem('budgetApi') || '';
let DATA = JSON.parse(localStorage.getItem('budgetData') || 'null');
let VIEW = localStorage.getItem('budgetView') || 'household'; // user1, user2, household
let FORM_USER = 'user1';
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

    // View switcher
    $('btnUser1').onclick = () => setView('user1');
    $('btnUser2').onclick = () => setView('user2');
    $('btnHousehold').onclick = () => setView('household');

    // Form user switcher
    $('formUser1').onclick = () => setFormUser('user1');
    $('formUser2').onclick = () => setFormUser('user2');

    // Show cached data immediately
    if (DATA) {
        updateUserNames();
        render();
    }

    if (!API) {
        showModal();
        toast('Set your Google Script URL first', 'err');
    } else {
        loadData();
    }

    setView(VIEW);
}

function setView(view) {
    VIEW = view;
    localStorage.setItem('budgetView', view);

    // Update nav buttons
    $('btnUser1').classList.toggle('active', view === 'user1');
    $('btnUser2').classList.toggle('active', view === 'user2');
    $('btnHousehold').classList.toggle('active', view === 'household');

    // Update add button color
    const addBtn = $('addBtn');
    addBtn.classList.remove('u1', 'u2');
    if (view === 'user1') addBtn.classList.add('u1');
    if (view === 'user2') addBtn.classList.add('u2');

    // Update stat card color
    const statCard = $('statCardMain');
    statCard.classList.remove('u1', 'u2');
    if (view === 'user1') statCard.classList.add('u1');
    if (view === 'user2') statCard.classList.add('u2');

    // Set form user to match view
    if (view === 'user1' || view === 'user2') {
        setFormUser(view);
    }

    // Show/hide appropriate views
    $('individualStats').style.display = view === 'household' ? 'none' : 'grid';
    $('comparisonView').style.display = view === 'household' ? 'block' : 'none';

    if (DATA) render();
}

function setFormUser(user) {
    FORM_USER = user;
    $('formUser1').classList.toggle('active', user === 'user1');
    $('formUser2').classList.toggle('active', user === 'user2');
    
    // Update submit button color
    const submitBtn = $('submitBtn');
    submitBtn.style.background = user === 'user1' ? 'var(--blue)' : 'var(--purple)';
}

function updateUserNames() {
    if (!DATA || !DATA.users) return;
    
    const u1 = DATA.users.user1 || 'Me';
    const u2 = DATA.users.user2 || 'Partner';
    
    $('btnUser1').textContent = u1;
    $('btnUser2').textContent = u2;
    $('formUser1').textContent = u1;
    $('formUser2').textContent = u2;
    $('userName1').value = u1;
    $('userName2').value = u2;
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
        updateUserNames();
        render();
    } catch (e) {
        console.error(e);
        toast('Failed to load data', 'err');
    }
}

function render() {
    if (!DATA) return;
    
    const { categories, transactions, stats, users } = DATA;
    const u1 = users.user1, u2 = users.user2;
    
    // Get current view stats
    const viewStats = VIEW === 'household' ? stats.household : stats[VIEW];
    
    // Update individual stats
    $('balance').textContent = `$${viewStats.balance.toFixed(2)}`;
    $('income').textContent = `+$${viewStats.income.toFixed(2)}`;
    $('expenses').textContent = `$${viewStats.expenses.toFixed(2)}`;
    
    // Percentage labels
    const pctClass = VIEW === 'user1' ? 'u1' : 'u2';
    $('incomePct').className = `pct ${pctClass}`;
    $('expensePct').className = `pct ${pctClass}`;
    
    if (VIEW === 'user1') {
        $('incomePct').textContent = `${stats.user1.incomePercent}%`;
        $('expensePct').textContent = `${stats.user1.expensePercent}%`;
    } else if (VIEW === 'user2') {
        $('incomePct').textContent = `${stats.user2.incomePercent}%`;
        $('expensePct').textContent = `${stats.user2.expensePercent}%`;
    }
    
    // Update comparison view
    const i1 = stats.user1.incomePercent || 0;
    const i2 = stats.user2.incomePercent || 0;
    const e1 = stats.user1.expensePercent || 0;
    const e2 = stats.user2.expensePercent || 0;
    
    $('incomeBar1').style.width = `${i1 || 50}%`;
    $('incomeBar1').textContent = `${i1}%`;
    $('incomeBar2').style.width = `${i2 || 50}%`;
    $('incomeBar2').textContent = `${i2}%`;
    $('incomeVal1').textContent = `${u1}: $${stats.user1.income.toFixed(0)}`;
    $('incomeVal2').textContent = `${u2}: $${stats.user2.income.toFixed(0)}`;
    
    $('expenseBar1').style.width = `${e1 || 50}%`;
    $('expenseBar1').textContent = `${e1}%`;
    $('expenseBar2').style.width = `${e2 || 50}%`;
    $('expenseBar2').textContent = `${e2}%`;
    $('expenseVal1').textContent = `${u1}: $${stats.user1.expenses.toFixed(0)}`;
    $('expenseVal2').textContent = `${u2}: $${stats.user2.expenses.toFixed(0)}`;
    
    $('totalIncome').textContent = `$${stats.household.income.toFixed(2)}`;
    $('totalExpenses').textContent = `$${stats.household.expenses.toFixed(2)}`;
    $('totalBalance').textContent = `$${stats.household.balance.toFixed(2)}`;
    $('totalBalance').style.color = stats.household.balance >= 0 ? 'var(--green)' : 'var(--red)';
    
    // Category dropdown
    $('txCat').innerHTML = '<option value="">Category</option>' + 
        categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    
    // Budgets
    const spending = viewStats.categorySpending;
    const budgetHtml = Object.entries(spending).map(([cat, d]) => {
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
    $('budgets').innerHTML = budgetHtml || '<div class="empty">No budgets</div>';
    
    // Transactions
    const month = parseInt(monthEl.value), year = parseInt(yearEl.value);
    let filtered = transactions.filter(t => {
        const d = new Date(t.Date);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
    });
    
    // Filter by user if not household view
    if (VIEW !== 'household') {
        const viewUser = VIEW === 'user1' ? u1 : u2;
        filtered = filtered.filter(t => t.User === viewUser);
    }
    
    if (filtered.length === 0) {
        $('transactions').innerHTML = '<div class="empty">No transactions this month</div>';
    } else {
        $('transactions').innerHTML = filtered.slice(0, 20).map(t => {
            const d = new Date(t.Date);
            const isInc = t.Type === 'Income';
            const isU1 = t.User === u1;
            const initials = t.User ? t.User.substring(0, 2).toUpperCase() : 'ME';
            
            return `
                <div class="trans-item">
                    <div class="trans-left">
                        <div class="trans-avatar ${isU1 ? 'u1' : 'u2'}">${initials}</div>
                        <div class="trans-info">
                            <div class="trans-desc">${t.Description}</div>
                            <div class="trans-meta">
                                ${d.toLocaleDateString('en', {month: 'short', day: 'numeric'})}
                                <span class="trans-cat">${t.Category}</span>
                            </div>
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
    renderCharts(viewStats);
    
    // Settings categories
    $('catList').innerHTML = categories.map(c => `
        <div class="cat-item">
            <span>${c.name}</span>
            <input type="number" class="cat-input" value="${c.budget}" 
                   onchange="updateBudget('${c.name}', this.value)">
        </div>`).join('');
}

function renderCharts(stats) {
    const catData = Object.entries(stats.categorySpending).filter(([_, d]) => d.spent > 0);
    const dayData = Object.entries(stats.dailySpending).sort((a, b) => a[0] - b[0]);
    
    // Determine chart colors based on view
    let colors = ['#000', '#333', '#555', '#777', '#999', '#bbb', '#ddd'];
    if (VIEW === 'user1') colors = ['#4a90d9', '#6ba3e0', '#8cb6e7', '#adc9ee', '#cedcf5'];
    if (VIEW === 'user2') colors = ['#9b59b6', '#af7ac5', '#c39bd3', '#d7bde2', '#ebdef0'];
    
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
                    backgroundColor: colors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }
            }
        });
    } else {
        ctx1.canvas.parentElement.innerHTML = '<div class="empty">No data</div>';
    }
    
    // Daily chart
    const ctx2 = $('dayChart').getContext('2d');
    if (dayChart) dayChart.destroy();
    
    const lineColor = VIEW === 'user1' ? '#4a90d9' : VIEW === 'user2' ? '#9b59b6' : '#000';
    
    if (dayData.length > 0) {
        dayChart = new Chart(ctx2, {
            type: 'line',
            data: {
                labels: dayData.map(([d]) => d),
                datasets: [{
                    data: dayData.map(([_, v]) => v),
                    borderColor: lineColor,
                    backgroundColor: lineColor + '15',
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
    } else {
        ctx2.canvas.parentElement.innerHTML = '<div class="empty">No data</div>';
    }
}

async function addTransaction(e) {
    e.preventDefault();
    if (!API) return toast('Configure API URL first', 'err');
    
    const userName = FORM_USER === 'user1' ? DATA.users.user1 : DATA.users.user2;
    
    const data = {
        date: $('txDate').value,
        category: $('txCat').value,
        description: $('txDesc').value,
        amount: $('txAmt').value,
        type: $('txType').value,
        user: userName
    };
    
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
    if (DATA && DATA.users) {
        $('userName1').value = DATA.users.user1 || '';
        $('userName2').value = DATA.users.user2 || '';
    }
}

function hideModal() {
    $('modal').classList.remove('show');
}

async function saveSettings() {
    const url = $('apiUrl').value.trim();
    if (!url) return toast('Enter API URL', 'err');
    
    API = url;
    localStorage.setItem('budgetApi', url);
    
    // Save user names
    const user1 = $('userName1').value.trim() || 'Me';
    const user2 = $('userName2').value.trim() || 'Partner';
    
    try {
        await fetch(`${API}?action=saveUsers&data=${encodeURIComponent(JSON.stringify({ user1, user2 }))}`);
        
        // Update local data
        if (DATA) {
            DATA.users = { user1, user2 };
            localStorage.setItem('budgetData', JSON.stringify(DATA));
        }
        
        updateUserNames();
        hideModal();
        loadData();
        toast('Saved!', 'ok');
    } catch (e) {
        toast('Failed to save', 'err');
    }
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