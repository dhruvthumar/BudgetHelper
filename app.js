var API = window.BUDGET_API || localStorage.getItem('budgetApi') || '';
var D = null;
var V = localStorage.getItem('bv') || 'household';
var FU = 'user1';
var cC = null, dC = null;
var $ = function(id) { return document.getElementById(id); };

Chart.defaults.animation = false;
Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false;

document.addEventListener('DOMContentLoaded', function() {
    var now = new Date();
    var ms = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    $('mo').innerHTML = ms.map(function(m, i) {
        return '<option value="' + (i + 1) + '">' + m + '</option>';
    }).join('');
    $('mo').value = now.getMonth() + 1;
    $('fDate').valueAsDate = now;

    try { D = JSON.parse(localStorage.getItem('bd')); } catch(e) {}
    if (D) { names(); draw(); }

    $('t1').onclick = function() { sv('user1'); };
    $('t2').onclick = function() { sv('user2'); };
    $('t3').onclick = function() { sv('household'); };
    $('addBtn').onclick = tf;
    $('fCancel').onclick = hf;
    $('fu1').onclick = function() { sfu('user1'); };
    $('fu2').onclick = function() { sfu('user2'); };
    $('txF').onsubmit = addTx;
    $('setBtn').onclick = sm;
    $('moX').onclick = hm;
    $('moBg').onclick = hm;
    $('savS').onclick = savSettings;
    $('mo').onchange = load;

    sv(V);

    if (!API) {
        sm();
        toast('Set API URL in settings', 'err');
    } else {
        load();
    }
});

function sv(v) {
    V = v;
    localStorage.setItem('bv', v);
    $('t1').className = 'tab' + (v === 'user1' ? ' on' : '');
    $('t2').className = 'tab' + (v === 'user2' ? ' on' : '');
    $('t3').className = 'tab' + (v === 'household' ? ' on' : '');
    $('t1').setAttribute('data-v', 'user1');
    $('t2').setAttribute('data-v', 'user2');
    $('t3').setAttribute('data-v', 'household');
    $('addBtn').className = 'add-b' + (v === 'user1' ? ' u1' : v === 'user2' ? ' u2' : '');
    $('balCard').style.display = v === 'household' ? 'none' : '';
    $('cmpView').className = 'cmp' + (v === 'household' ? ' show' : '');
    if (v !== 'household') sfu(v);
    if (D) draw();
}

function sfu(u) {
    FU = u;
    $('fu1').className = 'fm-ub u1' + (u === 'user1' ? ' on' : '');
    $('fu2').className = 'fm-ub u2' + (u === 'user2' ? ' on' : '');
    $('fSave').style.background = u === 'user1' ? 'var(--bl)' : 'var(--pu)';
}

function names() {
    if (!D || !D.u) return;
    $('t1').textContent = D.u.user1 || 'Me';
    $('t2').textContent = D.u.user2 || 'Partner';
    $('fu1').textContent = D.u.user1 || 'Me';
    $('fu2').textContent = D.u.user2 || 'Partner';
}

function tf() {
    var f = $('fm');
    var show = !f.classList.contains('show');
    f.classList.toggle('show', show);
    $('addBtn').textContent = show ? '× Cancel' : '+ Add';
    if (show) $('fDesc').focus();
}

function hf() {
    $('fm').classList.remove('show');
    $('addBtn').textContent = '+ Add';
    $('txF').reset();
    $('fDate').valueAsDate = new Date();
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
            try {
                data = JSON.parse(text);
            } catch(e) {
                console.error('Bad JSON:', text.substring(0, 200));
                throw new Error('Invalid response');
            }
            if (data.error) throw new Error(data.error);
            D = data;
            try { localStorage.setItem('bd', JSON.stringify(data)); } catch(e) {}
            names();
            draw();
            toast('Loaded', 'ok');
        })
        .catch(function(e) {
            console.error('Load error:', e);
            toast('Load failed: ' + e.message, 'err');
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

    // Balance
    $('bal').textContent = '$' + (vs.bl || 0).toFixed(2);
    $('inc').textContent = '+$' + (vs.i || 0).toFixed(2);
    $('exp').textContent = '-$' + (vs.e || 0).toFixed(2);

    if (V === 'user1') {
        $('incP').textContent = (s.u1.ip || 0) + '% of household';
        $('expP').textContent = (s.u1.ep || 0) + '% of household';
    } else if (V === 'user2') {
        $('incP').textContent = (s.u2.ip || 0) + '% of household';
        $('expP').textContent = (s.u2.ep || 0) + '% of household';
    }

    // Comparison bars
    var i1 = s.u1.ip || 0, i2 = s.u2.ip || 0;
    var e1 = s.u1.ep || 0, e2 = s.u2.ep || 0;

    $('ib1').style.width = (i1 || 50) + '%';
    $('ib1').textContent = i1 + '%';
    $('ib2').style.width = (i2 || 50) + '%';
    $('ib2').textContent = i2 + '%';
    $('iv1').textContent = u.user1 + ': $' + (s.u1.i || 0).toFixed(0);
    $('iv2').textContent = u.user2 + ': $' + (s.u2.i || 0).toFixed(0);

    $('eb1').style.width = (e1 || 50) + '%';
    $('eb1').textContent = e1 + '%';
    $('eb2').style.width = (e2 || 50) + '%';
    $('eb2').textContent = e2 + '%';
    $('ev1').textContent = u.user1 + ': $' + (s.u1.e || 0).toFixed(0);
    $('ev2').textContent = u.user2 + ': $' + (s.u2.e || 0).toFixed(0);

    $('hi').textContent = '$' + (s.h.i || 0).toFixed(2);
    $('he').textContent = '$' + (s.h.e || 0).toFixed(2);
    $('hb').textContent = '$' + (s.h.bl || 0).toFixed(2);
    $('hb').style.color = (s.h.bl || 0) >= 0 ? 'var(--gn)' : 'var(--rd)';

    // Categories dropdown
    if (D.cats) {
        $('fCat').innerHTML = '<option value="">Category</option>' +
            D.cats.map(function(c) {
                return '<option value="' + c.n + '">' + c.n + '</option>';
            }).join('');
    }

    // Budgets
    var cs = vs.cs || {};
    var bh = '';
    var hasBudget = false;
    for (var cat in cs) {
        hasBudget = true;
        var d = cs[cat];
        var spent = d.s || 0;
        var budget = d.b || 0;
        var p = budget > 0 ? Math.min(spent / budget * 100, 100) : 0;
        var cl = p > 90 ? ' o' : p > 75 ? ' w' : '';
        bh += '<div class="bi"><div class="bh"><span>' + cat + '</span><span>$' + spent.toFixed(0) + ' / $' + budget + '</span></div><div class="bb"><div class="bf' + cl + '" style="width:' + p + '%"></div></div></div>';
    }
    $('bud').innerHTML = hasBudget ? bh : '<div class="empty">No budgets</div>';

    // Transactions
    var month = parseInt($('mo').value);
    var year = new Date().getFullYear();
    var txList = D.tx || [];

    var filtered = txList.filter(function(t) {
        try {
            var parts = t.d.split('-');
            var txMonth = parseInt(parts[1]);
            var txYear = parseInt(parts[0]);
            return txMonth === month && txYear === year;
        } catch(e) {
            return false;
        }
    });

    if (V !== 'household') {
        var viewUser = V === 'user1' ? u.user1 : u.user2;
        filtered = filtered.filter(function(t) { return t.u === viewUser; });
    }

    if (!filtered.length) {
        $('txs').innerHTML = '<div class="empty">No transactions this month</div>';
    } else {
        var h = '';
        var limit = Math.min(filtered.length, 25);
        for (var i = 0; i < limit; i++) {
            var t = filtered[i];
            var parts = t.d.split('-');
            var txDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            var isI = t.t === 'Income';
            var isU1 = t.u === u.user1;
            var ini = t.u ? t.u.substring(0, 2).toUpperCase() : 'ME';
            var dateStr = txDate.toLocaleDateString('en', {month: 'short', day: 'numeric'});

            h += '<div class="ti">' +
                '<div class="av ' + (isU1 ? 'a1' : 'a2') + '">' + ini + '</div>' +
                '<div class="tl">' +
                    '<div class="td">' + (t.ds || 'No description') + '</div>' +
                    '<div class="tm">' + dateStr + ' <span class="tc">' + (t.c || '') + '</span></div>' +
                '</div>' +
                '<div class="tr">' +
                    '<span class="ta ' + (isI ? 'green' : '') + '">' + (isI ? '+' : '-') + '$' + Math.abs(t.a || 0).toFixed(2) + '</span>' +
                    '<button class="db" onclick="del(' + t.r + ')">×</button>' +
                '</div>' +
            '</div>';
        }
        $('txs').innerHTML = h;
    }

    // Charts
    doCharts(vs);

    // Settings categories
    if (D.cats) {
        $('catL').innerHTML = D.cats.map(function(c) {
            return '<div class="ci"><span>' + c.n + '</span><input type="number" value="' + c.b + '" onchange="ubud(\'' + c.n + '\',this.value)"></div>';
        }).join('');
    }
}

function doCharts(vs) {
    // Destroy old charts safely
    try { if (cC) { cC.destroy(); cC = null; } } catch(e) {}
    try { if (dC) { dC.destroy(); dC = null; } } catch(e) {}

    // Rebuild canvas elements (fixes canvas reuse bugs)
    var catParent = $('cC').parentElement;
    catParent.innerHTML = '<canvas id="cC"></canvas>';
    var dayParent = $('dC').parentElement;
    dayParent.innerHTML = '<canvas id="dC"></canvas>';

    var cs = vs.cs || {};
    var ds = vs.ds || {};

    // Category data
    var cd = [];
    for (var k in cs) {
        if (cs[k].s > 0) cd.push([k, cs[k].s]);
    }

    // Daily data
    var dd = [];
    for (var k in ds) {
        dd.push([parseInt(k), ds[k]]);
    }
    dd.sort(function(a, b) { return a[0] - b[0]; });

    var colors = V === 'user1'
        ? ['#4A90D9','#6BA3E0','#8CB6E7','#ADC9EE','#CEDCF5','#3A7BC8','#2A6CB7']
        : V === 'user2'
        ? ['#9B6FB0','#AF85C0','#C39BD0','#D7B1E0','#EBCEF0','#8E5AA0','#7D4990']
        : ['#25343F','#3D5261','#557083','#6D8EA5','#FF9B51','#BFC9D1','#EAEFEF'];

    var lineColor = V === 'user1' ? '#4A90D9' : V === 'user2' ? '#9B6FB0' : '#FF9B51';

    // Category chart
    if (cd.length > 0) {
        cC = new Chart($('cC'), {
            type: 'doughnut',
            data: {
                labels: cd.map(function(x) { return x[0]; }),
                datasets: [{
                    data: cd.map(function(x) { return x[1]; }),
                    backgroundColor: colors.slice(0, cd.length),
                    borderWidth: 0
                }]
            },
            options: {
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { boxWidth: 8, font: { size: 10 }, padding: 6 }
                    }
                }
            }
        });
    } else {
        $('cC').parentElement.innerHTML = '<div class="empty">No spending data</div>';
    }

    // Daily chart
    if (dd.length > 0) {
        dC = new Chart($('dC'), {
            type: 'line',
            data: {
                labels: dd.map(function(x) { return x[0]; }),
                datasets: [{
                    data: dd.map(function(x) { return x[1]; }),
                    borderColor: lineColor,
                    backgroundColor: lineColor + '15',
                    tension: 0.3,
                    borderWidth: 1.5,
                    pointRadius: 2,
                    fill: true
                }]
            },
            options: {
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: function(v) { return '$' + v; }, font: { size: 10 } },
                        grid: { color: '#eee' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 10 } }
                    }
                }
            }
        });
    } else {
        $('dC').parentElement.innerHTML = '<div class="empty">No daily data</div>';
    }
}

function addTx(e) {
    e.preventDefault();
    if (!API) return toast('Set API URL', 'err');
    if (!D || !D.u) return toast('Data not loaded', 'err');

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
        return toast('Fill all fields', 'err');
    }

    hf();
    toast('Saving...');

    fetch(API + '?action=add&d=' + encodeURIComponent(JSON.stringify(data)))
        .then(function(r) { return r.text(); })
        .then(function(text) {
            var resp;
            try { resp = JSON.parse(text); } catch(e) {
                throw new Error('Bad response');
            }
            if (resp.error) throw new Error(resp.error);
            toast('Added!', 'ok');
            load(); // Reload data
        })
        .catch(function(e) {
            console.error('Add error:', e);
            toast('Failed: ' + e.message, 'err');
        });
}

function del(row) {
    if (!confirm('Delete this transaction?')) return;
    toast('Deleting...');

    fetch(API + '?action=del&r=' + row)
        .then(function(r) { return r.text(); })
        .then(function(text) {
            var resp;
            try { resp = JSON.parse(text); } catch(e) { throw new Error('Bad response'); }
            if (resp.error) throw new Error(resp.error);
            toast('Deleted', 'ok');
            load();
        })
        .catch(function(e) {
            console.error('Delete error:', e);
            toast('Failed: ' + e.message, 'err');
        });
}

function ubud(cat, b) {
    fetch(API + '?action=budget&d=' + encodeURIComponent(JSON.stringify({cat: cat, b: parseFloat(b)})))
        .then(function(r) { return r.text(); })
        .then(function(text) {
            var resp;
            try { resp = JSON.parse(text); } catch(e) { throw new Error('Bad response'); }
            if (resp.error) throw new Error(resp.error);
            toast('Budget updated', 'ok');
            load();
        })
        .catch(function(e) {
            toast('Failed', 'err');
        });
}

function sm() {
    $('modal').classList.add('show');
    $('apiI').value = API;
    if (D && D.u) {
        $('n1').value = D.u.user1 || '';
        $('n2').value = D.u.user2 || '';
    }
}

function hm() {
    $('modal').classList.remove('show');
}

function savSettings() {
    var url = $('apiI').value.trim();
    if (url) {
        API = url;
        localStorage.setItem('budgetApi', url);
    }

    var u1 = $('n1').value.trim() || 'Me';
    var u2 = $('n2').value.trim() || 'Partner';

    if (!API) return toast('Enter API URL', 'err');

    toast('Saving...');

    fetch(API + '?action=users&d=' + encodeURIComponent(JSON.stringify({user1: u1, user2: u2})))
        .then(function(r) { return r.text(); })
        .then(function(text) {
            var resp;
            try { resp = JSON.parse(text); } catch(e) { throw new Error('Bad response'); }
            if (resp.error) throw new Error(resp.error);
            if (D) {
                D.u = {user1: u1, user2: u2};
                try { localStorage.setItem('bd', JSON.stringify(D)); } catch(e) {}
            }
            names();
            hm();
            load();
            toast('Saved!', 'ok');
        })
        .catch(function(e) {
            toast('Failed: ' + e.message, 'err');
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