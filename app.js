var API = window.BUDGET_API || localStorage.getItem('budgetApi') || '';
var D = null;
var V = localStorage.getItem('bv') || 'household';
var FU = 'user1';
var cC = null, dC = null;
var EDIT_ROW = null;
var DEL_ROW = null;
var $ = function(id) { return document.getElementById(id); };

// Color palette
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

    // Delete modal
    $('delX').onclick = hdm;
    $('delBg').onclick = hdm;
    $('delNo').onclick = hdm;
    $('delYes').onclick = confirmDel;

    $('mo').onchange = load;

    sv(V);

    if (!API) {
        sm();
        toast('SET API URL', 'err');
    } else {
        load();
    }
});

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
    $('balCard').style.display = v === 'household' ? 'none' : '';
    $('cmpView').className = 'cmp' + (v === 'household' ? ' show' : '');

    if (D && D.u && v !== 'household') {
        var name = v === 'user1' ? D.u.user1 : D.u.user2;
        $('balTag').textContent = name.toUpperCase();
    } else {
        $('balTag').textContent = 'BALANCE';
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
        $('balTag').textContent = name.toUpperCase();
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
    var vs;

    if (V === 'user1') vs = s.u1;
    else if (V === 'user2') vs = s.u2;
    else vs = s.h;
    if (!vs) return;

    $('bal').textContent = '$' + (vs.bl || 0).toFixed(2);
    $('inc').textContent = '+$' + (vs.i || 0).toFixed(2);
    $('exp').textContent = '-$' + (vs.e || 0).toFixed(2);

    if (V === 'user1') {
        $('incP').textContent = (s.u1.ip || 0) + '% OF HOUSEHOLD';
        $('expP').textContent = (s.u1.ep || 0) + '% OF HOUSEHOLD';
    } else if (V === 'user2') {
        $('incP').textContent = (s.u2.ip || 0) + '% OF HOUSEHOLD';
        $('expP').textContent = (s.u2.ep || 0) + '% OF HOUSEHOLD';
    }

    // Comparison
    var i1 = s.u1.ip || 0, i2 = s.u2.ip || 0;
    var e1 = s.u1.ep || 0, e2 = s.u2.ep || 0;

    $('ib1').style.width = (i1 || 50) + '%'; $('ib1').textContent = i1 + '%';
    $('ib2').style.width = (i2 || 50) + '%'; $('ib2').textContent = i2 + '%';
    $('iv1').textContent = u.user1.toUpperCase() + ': $' + (s.u1.i || 0).toFixed(0);
    $('iv2').textContent = u.user2.toUpperCase() + ': $' + (s.u2.i || 0).toFixed(0);

    $('eb1').style.width = (e1 || 50) + '%'; $('eb1').textContent = e1 + '%';
    $('eb2').style.width = (e2 || 50) + '%'; $('eb2').textContent = e2 + '%';
    $('ev1').textContent = u.user1.toUpperCase() + ': $' + (s.u1.e || 0).toFixed(0);
    $('ev2').textContent = u.user2.toUpperCase() + ': $' + (s.u2.e || 0).toFixed(0);

    $('hi').textContent = '$' + (s.h.i || 0).toFixed(2);
    $('he').textContent = '$' + (s.h.e || 0).toFixed(2);
    $('hb').textContent = '$' + (s.h.bl || 0).toFixed(2);

    // Categories dropdown
    if (D.cats) {
        $('fCat').innerHTML = '<option value="">CATEGORY</option>' +
            D.cats.map(function(c) {
                return '<option value="' + c.n + '">' + c.n.toUpperCase() + '</option>';
            }).join('');
    }

    // Budgets
    var cs = vs.cs || {};
    var bh = '';
    var has = false;
    for (var cat in cs) {
        has = true;
        var d = cs[cat];
        var spent = d.s || 0;
        var budget = d.b || 0;
        var p = budget > 0 ? Math.min(spent / budget * 100, 100) : 0;
        var cl = p > 75 ? ' w' : '';
        if (p > 90) cl = ' o';
        bh += '<div class="bi"><div class="bh"><span>' + cat.toUpperCase() + '</span><span>$' + spent.toFixed(0) + ' / $' + budget + '</span></div><div class="bb"><div class="bf' + cl + '" style="width:' + p + '%"></div></div></div>';
    }
    $('bud').innerHTML = has ? bh : '<div class="empty">NO BUDGETS SET</div>';

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

    doCharts(vs);

    if (D.cats) {
        $('catL').innerHTML = D.cats.map(function(c) {
            return '<div class="ci"><span>' + c.n.toUpperCase() + '</span><input type="number" value="' + c.b + '" onchange="ubud(\'' + c.n + '\',this.value)"></div>';
        }).join('');
    }
}

function doCharts(vs) {
    // Destroy old charts
    try { if (cC) { cC.destroy(); cC = null; } } catch(e) {}
    try { if (dC) { dC.destroy(); dC = null; } } catch(e) {}

    // Reset canvas elements
    $('catChartWrap').innerHTML = '<canvas id="cC"></canvas>';
    $('dayChartWrap').innerHTML = '<canvas id="dC"></canvas>';

    var cs = vs.cs || {};
    var ds = vs.ds || {};

    // Prepare category data
    var cd = [];
    for (var k in cs) {
        if (cs[k].s > 0) {
            cd.push({name: k, value: cs[k].s});
        }
    }

    // Prepare daily data
    var dd = [];
    for (var k in ds) {
        dd.push({day: parseInt(k), value: ds[k]});
    }
    dd.sort(function(a, b) { return a.day - b.day; });

    // 4 color palette for charts
    var chartColors = [COLORS.dark, COLORS.gold, COLORS.sage, COLORS.cream];

    // Category Chart (Doughnut)
    if (cd.length > 0) {
        var ctx1 = $('cC');
        if (ctx1) {
            cC = new Chart(ctx1, {
                type: 'doughnut',
                data: {
                    labels: cd.map(function(x) { return x.name.toUpperCase(); }),
                    datasets: [{
                        data: cd.map(function(x) { return x.value; }),
                        backgroundColor: cd.map(function(x, i) {
                            return chartColors[i % chartColors.length];
                        }),
                        borderWidth: 3,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    cutout: '50%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                boxWidth: 12,
                                boxHeight: 12,
                                font: { size: 10, weight: 'bold' },
                                padding: 8,
                                color: COLORS.dark
                            }
                        }
                    }
                }
            });
        }
    } else {
        $('catChartWrap').innerHTML = '<div class="empty">NO SPENDING DATA</div>';
    }

    // Daily Chart (Bar)
    if (dd.length > 0) {
        var ctx2 = $('dC');
        if (ctx2) {
            dC = new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: dd.map(function(x) { return x.day; }),
                    datasets: [{
                        data: dd.map(function(x) { return x.value; }),
                        backgroundColor: COLORS.gold,
                        borderColor: COLORS.dark,
                        borderWidth: 2
                    }]
                },
                options: {
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(v) { return '$' + v; },
                                font: { size: 10, weight: 'bold' },
                                color: COLORS.dark
                            },
                            grid: {
                                color: COLORS.sage,
                                lineWidth: 1
                            },
                            border: {
                                color: COLORS.dark,
                                width: 2
                            }
                        },
                        x: {
                            grid: { display: false },
                            ticks: {
                                font: { size: 10, weight: 'bold' },
                                color: COLORS.dark
                            },
                            border: {
                                color: COLORS.dark,
                                width: 2
                            }
                        }
                    }
                }
            });
        }
    } else {
        $('dayChartWrap').innerHTML = '<div class="empty">NO DAILY DATA</div>';
    }
}

function saveTx(e) {
    e.preventDefault();
    if (!API) return toast('SET API URL', 'err');
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

    if (EDIT_ROW) {
        toast('UPDATING...');
        fetch(API + '?action=del&r=' + EDIT_ROW)
            .then(function(r) { return r.text(); })
            .then(function() {
                return fetch(API + '?action=add&d=' + encodeURIComponent(JSON.stringify(data)));
            })
            .then(function(r) { return r.text(); })
            .then(function(text) {
                var resp;
                try { resp = JSON.parse(text); } catch(e) { throw new Error('Bad'); }
                if (resp.error) throw new Error(resp.error);
                hf();
                toast('UPDATED', 'ok');
                load();
            })
            .catch(function(e) {
                toast('FAILED', 'err');
            });
    } else {
        toast('SAVING...');
        fetch(API + '?action=add&d=' + encodeURIComponent(JSON.stringify(data)))
            .then(function(r) { return r.text(); })
            .then(function(text) {
                var resp;
                try { resp = JSON.parse(text); } catch(e) { throw new Error('Bad'); }
                if (resp.error) throw new Error(resp.error);
                hf();
                toast('ADDED', 'ok');
                load();
            })
            .catch(function(e) {
                toast('FAILED', 'err');
            });
    }
}

function delTx(row, desc, amt) {
    DEL_ROW = row;
    $('delText').innerHTML = 'Delete <strong>' + (desc || 'this transaction').toUpperCase() + '</strong> ($' + Math.abs(amt).toFixed(2) + ')?';
    $('delModal').classList.add('show');
}

function hdm() {
    DEL_ROW = null;
    $('delModal').classList.remove('show');
}

function confirmDel() {
    if (!DEL_ROW) return;
    var row = DEL_ROW;
    hdm();
    toast('DELETING...');

    fetch(API + '?action=del&r=' + row)
        .then(function(r) { return r.text(); })
        .then(function(text) {
            var resp;
            try { resp = JSON.parse(text); } catch(e) { throw new Error('Bad'); }
            if (resp.error) throw new Error(resp.error);
            toast('DELETED', 'ok');
            load();
        })
        .catch(function(e) {
            toast('FAILED', 'err');
        });
}

function ubud(cat, b) {
    fetch(API + '?action=budget&d=' + encodeURIComponent(JSON.stringify({cat: cat, b: parseFloat(b)})))
        .then(function(r) { return r.text(); })
        .then(function(text) {
            var resp;
            try { resp = JSON.parse(text); } catch(e) { throw new Error('Bad'); }
            if (resp.error) throw new Error(resp.error);
            toast('UPDATED', 'ok');
            load();
        })
        .catch(function() { toast('FAILED', 'err'); });
}

function sm() {
    $('modal').classList.add('show');
    $('apiI').value = API;
    if (D && D.u) {
        $('n1').value = D.u.user1 || '';
        $('n2').value = D.u.user2 || '';
    }
}

function hm() { $('modal').classList.remove('show'); }

function savSettings() {
    var url = $('apiI').value.trim();
    if (url) { API = url; localStorage.setItem('budgetApi', url); }

    var u1 = $('n1').value.trim() || 'Me';
    var u2 = $('n2').value.trim() || 'Partner';

    if (!API) return toast('ENTER API URL', 'err');
    toast('SAVING...');

    fetch(API + '?action=users&d=' + encodeURIComponent(JSON.stringify({user1: u1, user2: u2})))
        .then(function(r) { return r.text(); })
        .then(function(text) {
            var resp;
            try { resp = JSON.parse(text); } catch(e) { throw new Error('Bad'); }
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

function toast(msg, type) {
    var old = document.querySelector('.toast');
    if (old) old.remove();
    var t = document.createElement('div');
    t.className = 'toast' + (type ? ' ' + type : '');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function() { if (t.parentNode) t.remove(); }, 2500);
}