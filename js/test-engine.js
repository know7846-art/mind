/**
 * 마음체크 - 간이 자가검사 / 유형테스트 공통 엔진
 * - config.mode === 'type'  → 유형 결과(연애스타일 등, 항목별 카운트 최다 유형)
 * - 그 외(기본)             → 점수 결과(외로움/스트레스/마음날씨 등, 총점→구간)
 */
function runTest(config) {
  const app = document.getElementById('app');
  const mode = config.mode || 'score';
  let step = -1; // -1: 인트로, 0..n-1: 문항, n: 결과
  const answers = new Array(config.questions.length).fill(null);
  const maxScore = config.questions.length * 3;

  Hub.log('test_view', config.id);

  function render() {
    if (step === -1) renderIntro();
    else if (step < config.questions.length) renderQuestion();
    else renderResult();
  }

  function renderIntro() {
    const intro = config.intro;
    const checklist = (intro.checklist || []).map(item =>
      `<div class="checklist-item"><span class="ck">✓</span><span>${item}</span></div>`
    ).join('');
    app.innerHTML = `
      <div class="intro-box">
        ${intro.badge ? `<span class="intro-badge" style="background:${intro.badgeBg || 'var(--primary-light)'};color:${intro.badgeColor || 'var(--primary-dark)'}">${intro.badge}</span>` : ''}
        <div class="intro-emoji">${intro.emoji}</div>
        <p class="intro-title">${intro.title}</p>
        <p class="intro-hook">${intro.hook}</p>
        ${checklist ? `<div class="checklist-box"><p class="checklist-label">🔎 결과에서 확인할 내용</p>${checklist}</div>` : ''}
        <button class="btn-next" id="btn-start">${intro.cta || '시작하기 →'}</button>
        <div class="intro-meta-row">
          <span class="intro-meta-chip">⏱ ${config.questions.length}문항 · 1분</span>
          ${intro.metaExtra ? `<span class="intro-meta-chip">${intro.metaExtra}</span>` : ''}
        </div>
      </div>
    `;
    document.getElementById('btn-start').addEventListener('click', () => {
      Hub.log('test_start', config.id);
      step = 0;
      render();
    });
  }

  function renderQuestion() {
    const q = config.questions[step];
    const pct = Math.round((step / config.questions.length) * 100);
    app.innerHTML = `
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <p class="q-num">${step + 1} / ${config.questions.length} ${'✨'.repeat(step + 1)}</p>
      <p class="q-text">${q.text}</p>
      <div class="opt-list">
        ${q.options.map((o, i) => `<button class="opt-btn" data-i="${i}">${o.label}</button>`).join('')}
      </div>
    `;
    const buttons = app.querySelectorAll('.opt-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        buttons.forEach(b => b.disabled = true);
        btn.classList.add('selected');
        answers[step] = q.options[Number(btn.getAttribute('data-i'))];
        setTimeout(() => {
          step++;
          render();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 280);
      });
    });
  }

  function renderResult() {
    if (mode === 'type') renderTypeResult();
    else renderScoreResult();
  }

  function renderScoreResult() {
    const total = answers.reduce((a, b) => a + (b ? b.score : 0), 0);
    const band = config.bands.find(b => total <= b.max) || config.bands[config.bands.length - 1];
    const gaugePct = Math.min(100, Math.round((total / maxScore) * 100));
    Hub.log('test_complete', config.id, `score:${total};band:${band.label}`);

    app.innerHTML = `
      <div class="result-card ${band.tone || ''}">
        <p class="result-eyebrow">Today's Result</p>
        <div class="result-emoji">${band.emoji}</div>
        <p class="result-band">${band.label}</p>
        <div class="gauge"><div class="gauge-fill" style="width:0%"></div></div>
        <p class="gauge-label">나의 ${config.gaugeLabel || '지수'}: <b>${total} / ${maxScore}</b></p>
        <p class="result-desc">${band.desc}</p>
      </div>
      ${shareResultBlock()}
      <div id="cta-slot"></div>
      ${basisBlock()}
      ${backLink()}
    `;
    requestAnimationFrame(() => {
      const fill = app.querySelector('.gauge-fill');
      if (fill) setTimeout(() => { fill.style.width = gaugePct + '%'; }, 80);
    });
    wireResultActions(() => `[마음체크] ${config.intro.title} 결과: ${band.label} ${band.emoji}`);
    Hub.renderCTA(document.getElementById('cta-slot'), config.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderTypeResult() {
    const tally = {};
    answers.forEach(a => { if (a && a.type) tally[a.type] = (tally[a.type] || 0) + 1; });
    const winnerKey = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0];
    const t = config.types[winnerKey];
    Hub.log('test_complete', config.id, `type:${winnerKey}`);

    const traits = (t.traits || []).map(x => `<div class="type-trait">🔹 ${x}</div>`).join('');
    const matchType = t.match ? config.types[t.match] : null;

    app.innerHTML = `
      <div class="type-card">
        <div class="cover-sparkle"></div>
        <p class="type-eyebrow">${config.typeEyebrow || 'RESULT TYPE'}</p>
        <div class="type-emoji">${t.emoji}</div>
        <p class="type-title">${t.title}</p>
        <p class="type-desc">${t.desc}</p>
        <div class="type-traits">${traits}</div>
        ${matchType ? `<div class="type-match">✨ 찰떡궁합: ${matchType.emoji} ${matchType.title}</div>` : ''}
      </div>
      ${shareResultBlock()}
      <div id="cta-slot"></div>
      ${basisBlock()}
      ${backLink()}
    `;
    wireResultActions(() => `[마음체크] ${config.intro.title} 결과: ${t.title} ${t.emoji}`);
    Hub.renderCTA(document.getElementById('cta-slot'), config.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function shareResultBlock() {
    return `<div class="share-row"><button class="btn-share" id="btn-share">📸 결과 공유하기</button></div>`;
  }
  function basisBlock() {
    return `<details class="basis-box"><summary>🔍 이 검사는 어떻게 만들어졌나요?</summary><div class="basis-body">${config.basis}</div></details>`;
  }
  function backLink() {
    return `<a class="back-link" href="../index.html" style="display:block;text-align:center;margin-top:18px;">🌱 다른 검사 더 해보기</a>`;
  }

  function wireResultActions(shareTextFn) {
    const btn = document.getElementById('btn-share');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      Hub.log('share_click', config.id);
      const shareText = shareTextFn() + `\n나도 해보기 👉 `;
      const shareUrl = location.origin + location.pathname.replace(/[^/]+$/, '') + '../index.html';
      if (navigator.share) {
        try { await navigator.share({ title: '마음체크', text: shareText, url: shareUrl }); return; } catch (e) { /* 사용자 취소 등 */ }
      }
      try {
        await navigator.clipboard.writeText(shareText + shareUrl);
        alert('결과가 클립보드에 복사됐어요! 친구에게 붙여넣기 해보세요 📋');
      } catch (e) {
        alert(shareText + shareUrl);
      }
    });
  }

  render();
}
