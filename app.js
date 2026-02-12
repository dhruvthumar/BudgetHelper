// Get API from: config.js (GitHub Actions) → localStorage → empty
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
    $('savS').onclick = ss;
    $('mo').onchange = load;

    sv(V);

    // Only show settings if NO API from any source
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

    var ab = $('addBtn');
    ab.className = 'add-b' + (v === 'user1' ? ' u1' : v === 'user2' ? ' u2' : '');

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
    $('t1').textContent = D.u.user1;
    $('t2').textContent = D.u.user2;
    $('fu1').textContent = D.u.user1;
    $('fu2').textContent = D.u.user2;
}

function tf() {
    var f = $('fm'), show = !f.classList.contains('show');
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
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.error) throw new Error(data.error);
            D = data;
            try { localStorage.setItem('bd', JSON.stringify(data)); } catch(e) {}
            names();
            draw();
        })
        .catch(function(e) {
            console.error(e);
            toast('Load failed', 'err');
        });
}

function draw() {
    if (!D) return;
    var s = D.s, u = D.u;
    var vs = V === 'household' ? s.h : s[V === 'user1' ? 'u1' : 'u2'];

    $('bal').textContent = '$' + vs.bl.toFixed(2);
    $('inc').textContent = '+$' + vs.i.toFixed(2);
    $('exp').textContent = '-$' + vs.e.toFixed(2);

    if (V === 'user1') {
        $('incP').textContent = s.u1.ip + '% of household';
        $('expP').textContent = s.u1.ep + '% of household';
    } else if (V === 'user2') {
        $('incP').textContent = s.u2.ip + '% of household';
        $('expP').textContent = s.u2.ep + '% of household';
    }

    var i1 = s.u1.ip || 0, i2 = s.u2.ip || 0;
    var e1 = s.u1.ep || 0, e2 = s.u2.ep || 0;

    $('ib1').style.width = (i1 || 50) + '%'; $('ib1').textContent = i1 + '%';
    $('ib2').style.width = (i2 || 50) + '%'; $('ib2').textContent = i2 + '%';
    $('iv1').textContent = u.user1 + ': $' + s.u1.i.toFixed(0);
    $('iv2').textContent = u.user2 + ': $' + s.u2.i.toFixed(0);

    $('eb1').style.width = (e1 || 50) + '%'; $('eb1').textContent = e1 + '%';
    $('eb2').style.width = (e2 || 50) + '%'; $('eb2').textContent = e2 + '%';
    $('ev1').textContent = u.user1 + ': $' + s.u1.e.toFixed(0);
    $('ev2').textContent = u.user2 + ': $' + s.u2.e.toFixed(0);

    $('hi').textContent = '$' + s.h.i.toFixed(2);
    $('he').textContent = '$' + s.h.e.toFixed(2);
    $('hb').textContent = '$' + s.h.bl.toFixed(2);
    $('hb').style.color = s.h.bl >= 0 ? 'var(--gn)' : 'var(--rd)';

    $('fCat').innerHTML = '<option value="">Category</option>' +
        D.cats.map(function(c) { return '<option value="' + c.n + '">' + c.n + '</option>'; }).join('');

    var cs = vs.cs;
    var bh = '';
    for (var cat in cs) {
        var d = cs[cat];
        var p = d.b > 0 ? Math.min(d.s / d.b * 100, 100) : 0;
        var cl = p > 90 ? ' o' : p > 75 ? ' w' : '';
        bh += '<div class="bi"><div class="bh"><span>' + cat + '</span><span>$' + d.s.toFixed(0) + '/$' + d.b + '</span></div><div class="bb"><div class="bf' + cl + '" style="width:' + p + '%"></div></div></div>';
    }
    $('bud').innerHTML = bh || '<div class="empty">No budgets</div>';

    var month = parseInt($('mo').value);
    var year = new Date().getFullYear();
    var filtered = D.tx.filter(function(t) {
        var d = new Date(t.d);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
    });

    if (V !== 'household') {
        var vu = V === 'user1' ? u.user1 : u.user2;
        filtered = filtered.filter(function(t) { return t.u === vu; });
    }

    if (!filtered.length) {
        $('txs').innerHTML = '<div class="empty">No transactions</div>';
    } else {
        var h = '';
        var limit = Math.min(filtered.length, 20);
        for (var i = 0; i < limit; i++) {
            var t = filtered[i];
            var dd = new Date(t.d);
            var isI = t.t === 'Income';
            var isU1 = t.u === u.user1;
            var ini = t.u ? t.u.substring(0, 2).toUpperCase() : 'ME';
            h += '<div class="ti"><div class="av ' + (isU1 ? 'a1' : 'a2') + '">' + ini + '</div><div class="tl"><div class="td">' + t.ds + '</div><div class="tm">' + dd.toLocaleDateString('en', {month:'short',day:'numeric'}) + ' <span class="tc">' + t.c + '</span></div></div><div class="tr"><span class="ta ' + (isI ? 'green' : '') + '">' + (isI ? '+' : '-') + '$' + Math.abs(t.a).toFixed(2) + '</span><button class="db" onclick="del(' + t.r + ')">×</button></div></div>';
        }
        $('txs').innerHTML = h;
    }

    charts(vs);

    $('catL').innerHTML = D.cats.map(function(c) {
        return '<div class="ci"><span>' + c.n + '</span><input type="number" value="' + c.b + '" onchange="ubud(\'' + c.n + '\',this.value)"></div>';
    }).join('');
}

function charts(vs) {
    var cd = [], dd = [];
    for (var k in vs.cs) { if (vs.cs[k].s > 0) cd.push([k, vs.cs[k].s]); }
    for (var k in vs.ds) { dd.push([parseInt(k), vs.ds[k]]); }
    dd.sort(function(a, b) { return a[0] - b[0]; });

    var colors = V === 'user1' ? ['#4a90d9','#6ba3e0','#8cb6e7','#adc9ee','#cedcf5','#3a7bc8','#2a6cb7']
               : V === 'user2' ? ['#9b59b6','#af7ac5','#c39bd3','#d7bde2','#ebdef0','#8e44ad','#7d3c98']
               : ['#000','#333','#555','#777','#999','#bbb','#ddd'];

    var lc = V === 'user1' ? '#4a90d9' : V === 'user2' ? '#9b59b6' : '#000';

    var c1 = $('cC');
    if (cC) cC.destroy();
    if (cd.length) {
        cC = new Chart(c1, {
            type: 'doughnut',
            data: {
                labels: cd.map(function(x) { return x[0]; }),
                datasets: [{ data: cd.map(function(x) { return x[1]; }), backgroundColor: colors, borderWidth: 0 }]
            },
            options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 8, font: { size: 10 }, padding: 8 } } } }
        });
    } else {
        c1.parentElement.innerHTML = '<div class="empty">No data</div>';
    }

    var c2 = $('dC');
    if (dC) dC.destroy();
    if (dd.length) {
        dC = new Chart(c2, {
            type: 'line',
            data: {
                labels: dd.map(function(x) { return x[0]; }),
                datasets: [{ data: dd.map(function(x) { return x[1]; }), borderColor: lc, backgroundColor: lc + '10', tension: 0.3, borderWidth: 1.5, pointRadius: 2, fill: true }]
            },
            options: {
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: function(v) { return '$' + v; }, font: { size: 10 } }, grid: { color: '#eee' } },
                    x: { grid: { display: false }, ticks: { font: { size: 10 } } }
                }
            }
        });
    } else {
        c2.parentElement.innerHTML = '<div class="empty">No data</div>';
    }
}

function addTx(e) {
    e.preventDefault();
    if (!API) return toast('Set API URL', 'err');

    var user = FU === 'user1' ? D.u.user1 : D.u.user2;
    var data = {
        date: $('fDate').value,
        cat: $('fCat').value,
        desc: $('fDesc').value,
        amt: $('fAmt').value,
        type: $('fType').value,
        user: user
    };

    hf();
    toast('Saving...');

    fetch(API + '?action=add&d=' + encodeURIComponent(JSON.stringify(data)))
        .then(function() { toast('Added!', 'ok'); load(); })
        .catch(function() { toast('Failed', 'err'); });
}

function del(row) {
    if (!confirm('Delete?')) return;
    fetch(API + '?action=del&r=' + row)
        .then(function() { toast('Deleted', 'ok'); load(); })
        .catch(function() { toast('Failed', 'err'); });
}

function ubud(cat, b) {
    fetch(API + '?action=budget&d=' + encodeURIComponent(JSON.stringify({cat: cat, b: parseFloat(b)})))
        .then(function() { toast('Updated', 'ok'); load(); })
        .catch(function() { toast('Failed', 'err'); });
}

function sm() {
    $('modal').classList.add('show');
    $('apiI').value = API;
    if (D && D.u) { $('n1').value = D.u.user1 || ''; $('n2').value = D.u.user2 || ''; }
}

function hm() { $('modal').classList.remove('show'); }

function ss() {
    var url = $('apiI').value.trim();
    if (url) {
        API = url;
        localStorage.setItem('budgetApi', url);
    }

    var u1 = $('n1').value.trim() || 'Me';
    var u2 = $('n2').value.trim() || 'Partner';

    if (API) {
        fetch(API + '?action=users&d=' + encodeURIComponent(JSON.stringify({user1: u1, user2: u2})))
            .then(function() {
                if (D) { D.u = {user1: u1, user2: u2}; try { localStorage.setItem('bd', JSON.stringify(D)); } catch(e) {} }
                names();
                hm();
                load();
                toast('Saved!', 'ok');
            })
            .catch(function() { toast('Failed', 'err'); });
    } else {
        toast('Enter API URL', 'err');
    }
}

function toast(msg, type) {
    var old = document.querySelector('.toast');
    if (old) old.remove();
    var t = document.createElement('div');
    t.className = 'toast' + (type ? ' ' + type : '');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function() { if (t.parentNode) t.remove(); }, 2000);
}