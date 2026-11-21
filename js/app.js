(function () {
  'use strict';
  var D = window.CIT_DATA, Q = D.questions, QUIZZES = D.quizzes;
  var L = ['A', 'B', 'C'];
  var app = document.getElementById('app');
  var player = new Audio();
  player.preload = 'none';
  window.__citPlayer = player;
  var playingBtn = null, state = null;

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function stopAudio() {
    try { player.pause(); } catch (e) {}
    if (playingBtn) { playingBtn.classList.remove('playing'); playingBtn.innerHTML = playingBtn.getAttribute('data-label'); }
    playingBtn = null;
  }
  function playClip(src, btn) {
    if (playingBtn === btn && !player.paused) { stopAudio(); return; }
    stopAudio();
    player.src = src;
    playingBtn = btn;
    btn.classList.add('playing');
    btn.innerHTML = '⏹ Stop';
    var p = player.play();
    if (p && p.catch) p.catch(function () { stopAudio(); });
  }
  player.addEventListener('ended', stopAudio);
  player.addEventListener('error', stopAudio);
  function playBtn(kind, id) {
    var label = kind === 'q' ? '🔊 Listen in Hazaragi' : '🔊 Hear the answer in Hazaragi';
    return '<button type="button" class="play' + (kind === 'a' ? ' ans' : '') + '" data-src="audio/' + kind + '_' + id + '.mp3" data-label="' + esc(label) + '">' + label + '</button>';
  }
  app.addEventListener('click', function (e) {
    var b = e.target.closest('.play');
    if (b) { playClip(b.getAttribute('data-src'), b); }
  });

  function getBest(n) { try { return localStorage.getItem('cit_best_' + n); } catch (e) { return null; } }
  function setBest(n, s) { try { var o = getBest(n); if (o === null || s > parseInt(o, 10)) localStorage.setItem('cit_best_' + n, String(s)); } catch (e) {} }

  function home() {
    stopAudio(); state = null;
    var h = '<section class="card"><h1>Australian Citizenship Practice Tests</h1>' +
      '<p>10 practice tests, 20 questions each. Every question has a <b>🔊 Hazaragi audio</b> button. After you answer, a second button reads the correct answer in Hazaragi.</p>' +
      '<ul class="rules"><li>One question at a time. Tap A, B or C.</li><li>You see right or wrong straight away.</li>' +
      '<li>To pass: at least <b>15 out of 20 (75%)</b> AND <b>all 5 Australian values questions</b> correct.</li></ul>' +
      '<p class="note"><b>Please note:</b> these are practice questions based on the official booklet <i>Australian Citizenship: Our Common Bond</i>. ' +
      'The real test questions are not public. Test 1 uses the 20 questions from the official Home Affairs practice test, word for word. Tests 2 to 10 were written from facts in the booklet. ' +
      'The audio is a computer voice reading a Hazaragi script; it may sound like Persian (Farsi).</p></section><div class="list">';
    QUIZZES.forEach(function (z) {
      var b = getBest(z.n);
      h += '<button type="button" class="qz" data-n="' + z.n + '"><span>Practice test ' + z.n +
        '<small>' + (z.n === 1 ? 'Official practice questions' : '20 questions · 5 values questions') + '</small></span>' +
        '<span class="best">' + (b !== null ? 'Best: ' + b + '/20' : 'Start ›') + '</span></button>';
    });
    h += '</div>';
    app.innerHTML = h;
    Array.prototype.forEach.call(app.querySelectorAll('.qz'), function (b) {
      b.addEventListener('click', function () { location.hash = '#/test/' + b.getAttribute('data-n'); });
    });
    window.scrollTo(0, 0);
  }

  function start(n) {
    var z = QUIZZES[n - 1];
    if (!z) { home(); return; }
    state = { z: z, i: 0, answers: [] };
    showQ();
  }

  function showQ() {
    stopAudio();
    var z = state.z, i = state.i, q = Q[z.ids[i]];
    var h = '<section class="card"><div class="progress"><span>Test ' + z.n + '</span><span>Question ' + (i + 1) + ' of ' + z.ids.length + '</span></div>' +
      '<div class="bar"><i style="width:' + Math.round(i / z.ids.length * 100) + '%"></i></div>';
    if (q.values) h += '<span class="tag v">Australian values</span>';
    if (q.official) h += '<span class="tag o">Official practice question</span>';
    h += '<div class="qtext">' + esc(q.q) + '</div>' + playBtn('q', q.id) + '<div class="opts">';
    q.o.forEach(function (o, k) { h += '<button type="button" class="opt" data-k="' + k + '"><b>' + L[k] + '</b><span>' + esc(o) + '</span></button>'; });
    h += '</div><div id="after"></div></section>';
    app.innerHTML = h;
    Array.prototype.forEach.call(app.querySelectorAll('.opt'), function (b) {
      b.addEventListener('click', function () { answer(parseInt(b.getAttribute('data-k'), 10)); });
    });
    window.scrollTo(0, 0);
  }

  function answer(k) {
    if (state.answers.length > state.i) return;
    var q = Q[state.z.ids[state.i]], ok = k === q.a;
    state.answers.push(k);
    var btns = app.querySelectorAll('.opt');
    Array.prototype.forEach.call(btns, function (b, j) {
      b.disabled = true;
      if (j === q.a) b.classList.add('correct');
      else if (j === k) b.classList.add('wrong');
    });
    var last = state.i === state.z.ids.length - 1;
    document.getElementById('after').innerHTML =
      '<div class="fb ' + (ok ? 'ok' : 'no') + '">' + (ok ? '✓ Correct' : '✗ Incorrect. The correct answer is ' + L[q.a] + '.') + '</div>' +
      playBtn('a', q.id) +
      '<button type="button" class="btn" id="next">' + (last ? 'See my result' : 'Next question ›') + '</button>';
    document.getElementById('next').addEventListener('click', function () {
      if (last) result(); else { state.i++; showQ(); }
    });
  }

  function result() {
    stopAudio();
    var z = state.z, score = 0, vOk = 0, vTot = 0, missed = [];
    z.ids.forEach(function (id, j) {
      var q = Q[id], ok = state.answers[j] === q.a;
      if (ok) score++; else missed.push(j);
      if (q.values) { vTot++; if (ok) vOk++; }
    });
    var pass = score >= 15 && vOk === vTot;
    setBest(z.n, score);
    var h = '<section class="card score"><h2>Test ' + z.n + ' result</h2>' +
      '<div class="big ' + (pass ? 'pass' : 'fail') + '">' + score + ' / ' + z.ids.length + '</div>' +
      '<div class="res ' + (pass ? 'pass' : 'fail') + '" id="verdict">' + (pass ? '✓ PASS' : '✗ NOT PASSED') + '</div>' +
      '<p>Overall: <b>' + Math.round(score / z.ids.length * 100) + '%</b> (need 75%, 15 out of 20)<br>' +
      'Australian values: <b>' + vOk + ' / ' + vTot + '</b> (need all ' + vTot + ')</p>';
    if (!pass) {
      var why = [];
      if (score < 15) why.push('you need at least 15 correct answers');
      if (vOk < vTot) why.push('you must get all ' + vTot + ' values questions right');
      h += '<p class="fail">Not passed because ' + why.join(' and ') + '.</p>';
    }
    h += '<button type="button" class="btn" id="retry">Try this test again</button>' +
      (z.n < QUIZZES.length ? '<button type="button" class="btn" id="nextq">Next test ›</button>' : '') +
      '<button type="button" class="btn sec" id="back">Back to all tests</button></section>';
    if (missed.length) {
      h += '<section class="card review"><h2>Review: questions you missed (' + missed.length + ')</h2>';
      missed.forEach(function (j) {
        var q = Q[z.ids[j]];
        h += '<div class="item">' + (q.values ? '<span class="tag v">Australian values</span>' : '') +
          '<div><b>' + (j + 1) + '. ' + esc(q.q) + '</b></div>' +
          '<div class="yours">Your answer: ' + L[state.answers[j]] + '. ' + esc(q.o[state.answers[j]]) + '</div>' +
          '<div class="right">Correct answer: ' + L[q.a] + '. ' + esc(q.o[q.a]) + '</div>' +
          '<div style="margin-top:8px">' + playBtn('q', q.id) + playBtn('a', q.id) + '</div></div>';
      });
      h += '</section>';
    } else {
      h += '<section class="card"><p class="pass"><b>Perfect! You got every question right.</b></p></section>';
    }
    app.innerHTML = h;
    document.getElementById('retry').addEventListener('click', function () { start(z.n); });
    var nq = document.getElementById('nextq');
    if (nq) nq.addEventListener('click', function () { location.hash = '#/test/' + (z.n + 1); });
    document.getElementById('back').addEventListener('click', function () { location.hash = '#/'; });
    window.scrollTo(0, 0);
  }

  function route() {
    var m = location.hash.match(/^#\/test\/(\d+)/);
    if (m) start(parseInt(m[1], 10)); else home();
  }
  window.addEventListener('hashchange', route);
  document.getElementById('homeLink').addEventListener('click', function (e) { e.preventDefault(); location.hash = '#/'; });
  route();
})();
