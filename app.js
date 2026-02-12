var API = window.BUDGET_API || localStorage.getItem('budgetApi') || '';
var PWD = localStorage.getItem('budgetPwd') || '';
var D = null;
var V = localStorage.getItem('bv') || 'household';
var FU = 'user1';
var mainChart = null;
var EDIT_ROW = null;
var DEL_ROW = null;
var DEL_INFO = null; // Store delete info
var logoClickCount = 0;
var logoClickTimer = null;
var $ = function(id) { return document.getElementById(id); };

var COLORS = {
    cream: '#FBF5DD',
    sage: '#A6CDC6',
    dark: '#16404D',
    gold: '#DDA853'
};

Chart.defaults.animation = false;
Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false;
Chart.defaults.font.family = "'Space Mono', monospace";

document.addEventListener('DOMContentLoaded', function() {
    var now = new Date();
    var ms = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    $('mo').innerHTML = ms.map(function(m, i) {
        return '<option value="' + (i + 1) + '">' + m + '</option>';
    }).join('');
    $('mo').value = now.getMonth() + 1;
    $('fDate').valueAsDate = now;

    try { D = JSON.parse(localStorage.getItem('bd')); } catch(e) {}
    if (D) { names(); draw(); }

    // Tabs
    $('t1').onclick = function() { sv('user1'); };
    $('t2').onclick = function() { sv('user2'); };
    $('t3').onclick = function() { sv('household'); };
    $('mt1').onclick = function() { sv('user1'); };
    $('mt2').onclick = function() { sv('user2'); };
    $('mt3').onclick = function() { sv('household'); };

    // Form
    $('addBtn').onclick = tf;
    $('fCancel').onclick = hf;
    $('fu1').onclick = function() { sfu('user1'); };
    $('fu2').onclick = function() { sfu('user2'); };
    $('txF').onsubmit = saveTx;

    // Settings modal
    $('setBtn').onclick = sm;
    $('moX').onclick = hm;
    $('moBg').onclick = hm;
    $('savS').onclick = savSettings;
    $('addCatBtn').onclick = addCategory;
    $('newCat').onkeypress = function(e) { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } };

    // Delete modal
    $('delX').onclick = hdm;
    $('delBg').onclick = hdm;
    $('delNo').onclick = hdm;
    $('delYes').onclick = confirmDel;

    // Setup modal
    $('setupSave').onclick = saveSetup;

    // Secret: Triple-click logo to change API
    $('logoBtn').onclick = function() {
        logoClickCount++;
        if (logoClickTimer) clearTimeout(logoClickTimer);
        logoClickTimer = setTimeout(function() { logoClickCount = 0; }, 500);
        if (logoClickCount >= 3) {
            logoClickCount = 0;
            showSetup();
        }
    };

    $('mo').onchange = load;

    sv(V);

    // Check if API is set
    if (!API) {
        showSetup();
    } else {
        load();
    }
});

function showSetup() {
    $('setupApi').value = API;
    $('setupModal').classList.add('show');
}

function saveSetup() {
    var url = $('setupApi').value.trim();
    if (!url) return toast('ENTER URL', 'err');
    API = url;
    localStorage.setItem('budgetApi', url);
    $('setupModal').classList.remove('show');
    toast('CONNECTED', 'ok');
    load();
}

function sv(v) {
    V = v;
    localStorage.setItem('bv', v);

    ['t1','t2','t3','mt1','mt2','mt3'].forEach(function(id) {
        var el = $(id);
        if (!el) return;
        var dv = el.getAttribute('data-v');
        el.className = 'tab' + (dv === v ? ' on' : '');
    });

    $('addBtn').textContent = '+ ADD TRANSACTION';

    if (D && D.u && v !== 'household') {
        var name = v === 'user1' ? D.u.user1 : D.u.user2;
        $('overviewTag').textContent = name.toUpperCase();
    } else {
        $('overviewTag').textContent = 'OVERVIEW';
    }

    if (v !== 'household') sfu(v);
    if (D) draw();
}

function sfu(u) {
    FU = u;
    $('fu1').className = 'fm-ub u1' + (u === 'user1' ? ' on' : '');
    $('fu2').className = 'fm-ub u2' + (u === 'user2' ? ' on' : '');
}

function names() {
    if (!D || !D.u) return;
    var n1 = (D.u.user1 || 'Me').toUpperCase();
    var n2 = (D.u.user2 || 'Partner').toUpperCase();
    $('t1').textContent = n1;
    $('t2').textContent = n2;
    $('t3').textContent = 'BOTH';
    $('mt1').textContent = n1;
    $('mt2').textContent = n2;
    $('mt3').textContent = 'BOTH';
    $('fu1').textContent = n1;
    $('fu2').textContent = n2;

    if (V !== 'household') {
        var name = V === 'user1' ? D.u.user1 : D.u.user2;
        $('overviewTag').textContent = name.toUpperCase();
    }
}

function tf() {
    EDIT_ROW = null;
    var f = $('fm');
    var show = !f.classList.contains('show');
    f.classList.toggle('show', show);
    $('addBtn').textContent = show ? '× CANCEL' : '+ ADD TRANSACTION';
    $('fmTitle').textContent = 'NEW TRANSACTION';
    $('fmEditId').textContent = '';
    if (show) {
        resetForm();
        $('fDesc').focus();
    }
}

function editTx(row) {
    if (!D || !D.tx) return;

    var tx = null;
    for (var i = 0; i < D.tx.length; i++) {
        if (D.tx[i].r === row) {
            tx = D.tx[i];
            break;
        }
    }
    if (!tx) return toast('NOT FOUND', 'err');

    EDIT_ROW = row;
    $('fm').classList.add('show');
    $('addBtn').textContent = '× CANCEL';
    $('fmTitle').textContent = 'EDIT TRANSACTION';
    $('fmEditId').textContent = '#' + row;

    $('fDate').value = tx.d;
    $('fDesc').value = tx.ds || '';
    $('fCat').value = tx.c || '';
    $('fAmt').value = Math.abs(tx.a) || '';
    $('fType').value = tx.t || 'Expense';

    var isU1 = tx.u === D.u.user1;
    sfu(isU1 ? 'user1' : 'user2');

    $('fDesc').focus();
}

function hf() {
    EDIT_ROW = null;
    $('fm').classList.remove('show');
    $('addBtn').textContent = '+ ADD TRANSACTION';
    resetForm();
}

function resetForm() {
    $('txF').reset();
    $('fDate').valueAsDate = new Date();
    $('fmTitle').textContent = 'NEW TRANSACTION';
    $('fmEditId').textContent = '';
}

function load() {
    if (!API) return;
    var m = $('mo').value;

    fetch(API + '?action=load&m=' + m)
        .then(function(r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.text();
        })
        .then(function(text) {
            var data;
            try { data = JSON.parse(text); } catch(e) {
                throw new Error('Bad response');
            }
            if (data.error) throw new Error(data.error);
            D = data;
            try { localStorage.setItem('bd', JSON.stringify(data)); } catch(e) {}
            names();
            draw();
        })
        .catch(function(e) {
            console.error(e);
            toast('LOAD FAILED', 'err');
        });
}

function draw() {
    if (!D || !D.s) return;
    var s = D.s;
    var u = D.u || {user1: 'Me', user2: 'Partner'};

    // Build overview
    var html = '';

    if (V === 'household') {
        // Show both users
        html += buildUserSection(u.user1, s.u1, true);
        html += buildUserSection(u.user2, s.u2, false);
    } else {
        // Show single user
        var vs = V === 'user1' ? s.u1 : s.u2;
        var name = V === 'user1' ? u.user1 : u.user2;
        html += buildUserSection(name, vs, V === 'user1', true);
    }

    $('overviewInner').innerHTML = html;

    // Categories dropdown
    if (D.cats) {
        $('fCat').innerHTML = '<option value="">CATEGORY</option>' +
            D.cats.map(function(c) {
                return '<option value="' + c.n + '">' + c.n.toUpperCase() + '</option>';
            }).join('');
    }

    // Transactions
    var month = parseInt($('mo').value);
    var year = new Date().getFullYear();
    var txList = D.tx || [];

    var filtered = txList.filter(function(t) {
        try {
            var parts = t.d.split('-');
            return parseInt(parts[1]) === month && parseInt(parts[0]) === year;
        } catch(e) { return false; }
    });

    if (V !== 'household') {
        var vu = V === 'user1' ? u.user1 : u.user2;
        filtered = filtered.filter(function(t) { return t.u === vu; });
    }

    if (!filtered.length) {
        $('txs').innerHTML = '<div class="empty">NO TRANSACTIONS</div>';
    } else {
        var h = '';
        var limit = Math.min(filtered.length, 30);
        for (var i = 0; i < limit; i++) {
            var t = filtered[i];
            var parts = t.d.split('-');
            var txDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            var isI = t.t === 'Income';
            var isU1 = t.u === u.user1;
            var ini = t.u ? t.u.substring(0, 2).toUpperCase() : 'ME';
            var dateStr = txDate.toLocaleDateString('en', {month: 'short', day: 'numeric'}).toUpperCase();

            h += '<div class="ti">' +
                '<div class="av ' + (isU1 ? 'a1' : 'a2') + '">' + ini + '</div>' +
                '<div class="tl">' +
                    '<div class="td">' + (t.ds || '—').toUpperCase() + '</div>' +
                    '<div class="tm">' + dateStr + ' <span class="tc">' + (t.c || '').toUpperCase() + '</span></div>' +
                '</div>' +
                '<div class="tr">' +
                    '<span class="ta ' + (isI ? 't-in' : 't-ex') + '">' + (isI ? '+' : '-') + '$' + Math.abs(t.a || 0).toFixed(2) + '</span>' +
                    '<div class="tx-actions">' +
                        '<button class="tx-btn" onclick="editTx(' + t.r + ')">EDIT</button>' +
                        '<button class="tx-btn del" onclick="delTx(' + t.r + ',\'' + (t.ds || '').replace(/'/g, "\\'") + '\',' + (t.a || 0) + ')">DEL</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        }
        $('txs').innerHTML = h;
    }

    drawChart();
}

function buildUserSection(name, stats, isU1, single) {
    var income = stats.i || 0;
    var expense = stats.e || 0;
    var balance = stats.bl || 0;
    var spendPct = income > 0 ? Math.min((expense / income) * 100, 100) : 0;

    return '<div class="user-section' + (single ? ' single' : '') + '">' +
        '<div class="user-header">' +
            '<div class="user-name"><div class="user-dot ' + (isU1 ? 'u1' : 'u2') + '"></div>' + name.toUpperCase() + '</div>' +
            '<div class="user-balance ' + (balance >= 0 ? 'positive' : 'negative') + '">$' + balance.toFixed(2) + '</div>' +
        '</div>' +
        '<div class="user-stats">' +
            '<div class="stat-box"><div class="stat-label">EARNED</div><div class="stat-value income">+$' + income.toFixed(2) + '</div></div>' +
            '<div class="stat-box"><div class="stat-label">SPENT</div><div class="stat-value expense">-$' + expense.toFixed(2) + '</div></div>' +
        '</div>' +
        '<div class="spend-bar"><div class="spend-fill" style="width:' + spendPct + '%"></div></div>' +
        '<div class="spend-text">' + spendPct.toFixed(0) + '% OF INCOME SPENT</div>' +
    '</div>';
}

function drawChart() {
    if (!D || !D.s) return;

    try { if (mainChart) { mainChart.destroy(); mainChart = null; } } catch(e) {}
    $('chartWrap').innerHTML = '<canvas id="mainChart"></canvas>';

    var u = D.u || {user1: 'Me', user2: 'Partner'};
    var s = D.s;

    var labels, incomeData, expenseData;

    if (V === 'household') {
        labels = [u.user1.toUpperCase(), u.user2.toUpperCase()];
        incomeData = [s.u1.i || 0, s.u2.i || 0];
        expenseData = [s.u1.e || 0, s.u2.e || 0];
    } else {
        var vs = V === 'user1' ? s.u1 : s.u2;
        var name = V === 'user1' ? u.user1 : u.user2;
        labels = ['INCOME', 'EXPENSES'];
        incomeData = [vs.i || 0];
        expenseData = [vs.e || 0];
    }

    var ctx = $('mainChart');
    if (!ctx) return;

    if (V === 'household') {
        // Grouped bar chart for household
        mainChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'INCOME',
                        data: incomeData,
                        backgroundColor: COLORS.dark,
                        borderColor: COLORS.dark,
                        borderWidth: 2
                    },
                    {
                        label: 'EXPENSES',
                        data: expenseData,
                        backgroundColor: COLORS.gold,
                        borderColor: COLORS.dark,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            font: { size: 10, weight: 'bold' },
                            color: COLORS.dark,
                            padding: 16
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(v) { return '$' + v; },
                            font: { size: 10, weight: 'bold' },
                            color: COLORS.dark
                        },
                        grid: { color: COLORS.sage },
                        border: { color: COLORS.dark, width: 2 }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 11, weight: 'bold' }, color: COLORS.dark },
                        border: { color: COLORS.dark, width: 2 }
                    }
                }
            }
        });
    } else {
        // Simple horizontal bar for single user
        var vs = V === 'user1' ? s.u1 : s.u2;
        mainChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['INCOME', 'EXPENSES'],
                datasets: [{
                    data: [vs.i || 0, vs.e || 0],
                    backgroundColor: [COLORS.dark, COLORS.gold],
                    borderColor: COLORS.dark,
                    borderWidth: 2
                }]
            },
            options: {
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(v) { return '$' + v; },
                            font: { size: 10, weight: 'bold' },
                            color: COLORS.dark
                        },
                        grid: { color: COLORS.sage },
                        border: { color: COLORS.dark, width: 2 }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { font: { size: 11, weight: 'bold' }, color: COLORS.dark },
                        border: { color: COLORS.dark, width: 2 }
                    }
                }
            }
        });
    }
}
// Modified saveTx function with better password handling
function saveTx(e) {
    e.preventDefault();
    if (!API) return toast('NOT CONNECTED', 'err');
    if (!D || !D.u) return toast('NOT LOADED', 'err');

    var user = FU === 'user1' ? D.u.user1 : D.u.user2;
    var data = {
        date: $('fDate').value,
        cat: $('fCat').value,
        desc: $('fDesc').value,
        amt: $('fAmt').value,
        type: $('fType').value,
        user: user
    };

    if (!data.date || !data.cat || !data.desc || !data.amt) {
        return toast('FILL ALL FIELDS', 'err');
    }

    // Check password
    if (!PWD) {
        var pwd = prompt('Enter password to save:');
        if (!pwd) {
            toast('CANCELLED', '');
            return;
        }
        PWD = pwd;
        localStorage.setItem('budgetPwd', pwd);
    }

    if (EDIT_ROW) {
        // Edit mode - delete old and add new
        toast('UPDATING...');
        
        fetch(API + '?action=del&pwd=' + encodeURIComponent(PWD) + '&r=' + EDIT_ROW)
            .then(function(r) { return r.text(); })
            .then(function(text) {
                var resp;
                try { resp = JSON.parse(text); } catch(e) { throw new Error('Bad response'); }
                
                if (resp.error) {
                    if (resp.error === 'Unauthorized') {
                        PWD = '';
                        localStorage.removeItem('budgetPwd');
                        toast('WRONG PASSWORD', 'err');
                        return;
                    }
                    throw new Error(resp.error);
                }
                
                // Now add the new transaction
                return fetch(API + '?action=add&pwd=' + encodeURIComponent(PWD) + '&d=' + encodeURIComponent(JSON.stringify(data)));
            })
            .then(function(r) { return r.text(); })
            .then(function(text) {
                var resp;
                try { resp = JSON.parse(text); } catch(e) { throw new Error('Bad response'); }
                if (resp.error) throw new Error(resp.error);
                
                hf();
                toast('UPDATED', 'ok');
                load();
            })
            .catch(function(e) {
                console.error('Update error:', e);
                toast('UPDATE FAILED', 'err');
            });
    } else {
        // Add new transaction
        toast('SAVING...');
        
        fetch(API + '?action=add&pwd=' + encodeURIComponent(PWD) + '&d=' + encodeURIComponent(JSON.stringify(data)))
            .then(function(r) { return r.text(); })
            .then(function(text) {
                var resp;
                try { resp = JSON.parse(text); } catch(e) { throw new Error('Bad response'); }
                
                if (resp.error) {
                    if (resp.error === 'Unauthorized') {
                        PWD = '';
                        localStorage.removeItem('budgetPwd');
                        toast('WRONG PASSWORD', 'err');
                        return;
                    }
                    throw new Error(resp.error);
                }
                
                hf();
                toast('ADDED', 'ok');
                load();
            })
            .catch(function(e) {
                console.error('Add error:', e);
                toast('ADD FAILED', 'err');
            });
    }
}
// Modified delTx function - store info and open modal
function delTx(row, desc, amt) {
    DEL_ROW = row;
    DEL_INFO = {row: row, desc: desc, amt: amt};
    $('delText').innerHTML = 'Delete <strong>' + (desc || 'this transaction').toUpperCase() + '</strong> ($' + Math.abs(amt).toFixed(2) + ')?';
    $('delModal').classList.add('show');
}

// Modified hdm function - clear delete info
function hdm() {
    DEL_ROW = null;
    DEL_INFO = null;
    $('delModal').classList.remove('show');
}

// Modified confirmDel function with proper password handling
function confirmDel() {
    if (!DEL_ROW) return;
    
    // Close the delete modal first
    var row = DEL_ROW;
    hdm();
    
    // Check if we have password
    if (!PWD) {
        promptPasswordForDelete(row);
        return;
    }
    
    // Proceed with deletion
    performDelete(row);
}

// New function specifically for password prompt before delete
function promptPasswordForDelete(row) {
    var pwd = prompt('Enter password to delete:');
    if (!pwd) {
        toast('CANCELLED', '');
        return;
    }
    
    PWD = pwd;
    localStorage.setItem('budgetPwd', pwd);
    performDelete(row);
}

// New function to actually perform the deletion
function performDelete(row) {
    if (!row || !API) return;
    
    toast('DELETING...');
    
    var url = API + '?action=del&pwd=' + encodeURIComponent(PWD) + '&r=' + row;
    
    fetch(url)
        .then(function(r) { 
            if (!r.ok) throw new Error('Network error');
            return r.text(); 
        })
        .then(function(text) {
            var resp;
            try { 
                resp = JSON.parse(text); 
            } catch(e) { 
                throw new Error('Invalid response'); 
            }
            
            if (resp.error) {
                if (resp.error === 'Unauthorized') {
                    PWD = '';
                    localStorage.removeItem('budgetPwd');
                    toast('WRONG PASSWORD', 'err');
                    // Try again with new password
                    promptPasswordForDelete(row);
                    return;
                }
                throw new Error(resp.error);
            }
            
            toast('DELETED', 'ok');
            load(); // Reload data
        })
        .catch(function(e) {
            console.error('Delete error:', e);
            toast('DELETE FAILED', 'err');
        });
}

// Modified addCategory with better password handling
function addCategory() {
    var name = $('newCat').value.trim();
    if (!name) return toast('ENTER NAME', 'err');
    if (!API) return toast('NOT CONNECTED', 'err');

    if (!PWD) {
        var pwd = prompt('Enter password to add category:');
        if (!pwd) {
            toast('CANCELLED', '');
            return;
        }
        PWD = pwd;
        localStorage.setItem('budgetPwd', pwd);
    }

    toast('ADDING...');
    
    fetch(API + '?action=addCat&pwd=' + encodeURIComponent(PWD) + '&name=' + encodeURIComponent(name))
        .then(function(r) { return r.text(); })
        .then(function(text) {
            var resp;
            try { resp = JSON.parse(text); } catch(e) { throw new Error('Bad response'); }
            
            if (resp.error) {
                if (resp.error === 'Unauthorized') {
                    PWD = '';
                    localStorage.removeItem('budgetPwd');
                    toast('WRONG PASSWORD', 'err');
                    return;
                }
                throw new Error(resp.error);
            }
            
            $('newCat').value = '';
            toast('CATEGORY ADDED', 'ok');
            load();
            setTimeout(renderCategories, 500);
        })
        .catch(function(e) {
            console.error('Add category error:', e);
            toast('FAILED', 'err');
        });
}

// Modified delCategory with better password handling
function delCategory(name) {
    if (!confirm('Delete category "' + name.toUpperCase() + '"?')) return;
    if (!API) return toast('NOT CONNECTED', 'err');

    if (!PWD) {
        var pwd = prompt('Enter password to delete category:');
        if (!pwd) {
            toast('CANCELLED', '');
            return;
        }
        PWD = pwd;
        localStorage.setItem('budgetPwd', pwd);
    }

    toast('DELETING...');
    
    fetch(API + '?action=delCat&pwd=' + encodeURIComponent(PWD) + '&name=' + encodeURIComponent(name))
        .then(function(r) { return r.text(); })
        .then(function(text) {
            var resp;
            try { resp = JSON.parse(text); } catch(e) { throw new Error('Bad response'); }
            
            if (resp.error) {
                if (resp.error === 'Unauthorized') {
                    PWD = '';
                    localStorage.removeItem('budgetPwd');
                    toast('WRONG PASSWORD', 'err');
                    return;
                }
                throw new Error(resp.error);
            }
            
            toast('CATEGORY DELETED', 'ok');
            load();
            setTimeout(renderCategories, 500);
        })
        .catch(function(e) {
            console.error('Delete category error:', e);
            toast('FAILED', 'err');
        });
}

// Modified savSettings function
function savSettings() {
    if (!API) return toast('NOT CONNECTED', 'err');
    if (!PWD) return promptPassword(savSettings);

    var u1 = $('n1').value.trim() || 'Me';
    var u2 = $('n2').value.trim() || 'Partner';

    toast('SAVING...');

    fetch(API + '?action=users&pwd=' + PWD + '&d=' + encodeURIComponent(JSON.stringify({user1: u1, user2: u2})))
        .then(function(r) { return r.text(); })
        .then(function(text) {
            var resp;
            try { resp = JSON.parse(text); } catch(e) { throw new Error('Bad'); }
            if (resp.error === 'Unauthorized') {
                PWD = '';
                localStorage.removeItem('budgetPwd');
                toast('WRONG PASSWORD', 'err');
                return promptPassword(savSettings);
            }
            if (resp.error) throw new Error(resp.error);
            if (D) {
                D.u = {user1: u1, user2: u2};
                try { localStorage.setItem('bd', JSON.stringify(D)); } catch(e) {}
            }
            names(); hm(); load();
            toast('SAVED', 'ok');
        })
        .catch(function(e) { toast('FAILED', 'err'); });
}

// New password prompt function
function promptPassword(callback) {
    var pwd = prompt('Enter password to make changes:');
    if (pwd) {
        PWD = pwd;
        localStorage.setItem('budgetPwd', pwd);
        if (callback) callback();
    }
}


// Add function to clear saved password
function clearPassword() {
    PWD = '';
    localStorage.removeItem('budgetPwd');
    toast('PASSWORD CLEARED', 'ok');
}

// Add a function to check if password works (optional)
function testPassword() {
    if (!PWD) {
        toast('NO PASSWORD SET', '');
        return;
    }
    
    // Test with a dummy request
    fetch(API + '?action=test&pwd=' + encodeURIComponent(PWD))
        .then(function(r) { return r.text(); })
        .then(function(text) {
            var resp;
            try { resp = JSON.parse(text); } catch(e) { throw new Error('Bad response'); }
            
            if (resp.error === 'Unauthorized') {
                toast('WRONG PASSWORD', 'err');
                PWD = '';
                localStorage.removeItem('budgetPwd');
            } else {
                toast('PASSWORD OK', 'ok');
            }
        })
        .catch(function(e) {
            console.error('Test error:', e);
        });
}

function toast(msg, type) {
    var old = document.querySelector('.toast');
    if (old) old.remove();
    var t = document.createElement('div');
    t.className = 'toast' + (type ? ' ' + type : '');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function() { if (t.parentNode) t.remove(); }, 2500);
}