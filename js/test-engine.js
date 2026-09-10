/**
 * 마음카드 - 간이 자가검사 / 유형테스트 공통 엔진
 * - config.mode === 'type'  → 유형 결과(연애스타일 등, 항목별 카운트 최다 유형)
 * - 그 외(기본)             → 점수 결과(외로움/스트레스/마음날씨 등, 총점→구간)
 */
function runTest(config) {
  const app = document.getElementById('app');
  const mode = config.mode || 'score';
  let step = -1; // -1: 인트로, 0..n-1: 문항, n: 결과
  const answers = new Array(config.questions.length).fill(null);
  const maxScore = config.questions.length * 3;

  // 공유 링크로 들어온 경우 → 퀴즈를 다시 안 풀어도 바로 그 결과가 보이게
  const shareParams = new URLSearchParams(location.search);
  let sharedTotal = null;
  let sharedTypeKey = null;
  if (shareParams.get('shared') === '1') {
    if (mode === 'type' && config.types[shareParams.get('type')]) {
      sharedTypeKey = shareParams.get('type');
      step = config.questions.length;
    } else if (mode !== 'type' && shareParams.has('score')) {
      const v = Number(shareParams.get('score'));
      if (!Number.isNaN(v)) {
        sharedTotal = Math.max(0, Math.min(maxScore, v));
        step = config.questions.length;
      }
    }
  }

  // 결과 공유 링크 생성용 (결과 렌더링 시 채워짐)
  let resultTotalForShare = null;
  let resultTypeKeyForShare = null;

  Hub.log('test_view', config.id);

  function render() {
    if (step === -1) renderIntro();
    else if (step < config.questions.length) renderQuestion();
    else renderResult();
  }

  // 결과 제목이 길어서 두 줄로 넘어가면 폰트 크기를 줄여 한 줄에 맞춤
  function fitTitleToOneLine(el, maxSize, minSize) {
    if (!el) return;
    el.style.whiteSpace = 'nowrap';
    let size = maxSize;
    el.style.fontSize = size + 'px';
    while (el.scrollWidth > el.clientWidth && size > minSize) {
      size -= 1;
      el.style.fontSize = size + 'px';
    }
    if (el.scrollWidth > el.clientWidth) {
      // 최소 크기로도 안 맞으면 그때만 줄바꿈 허용
      el.style.whiteSpace = 'normal';
    }
  }

  function renderIntro() {
    const intro = config.intro;
    const checklist = (intro.checklist || []).map(item =>
      `<div class="checklist-item"><span class="ck">✓</span><span>${item}</span></div>`
    ).join('');
    app.innerHTML = `
      <div class="intro-box">
        ${intro.badge ? `<span class="intro-badge" style="background:${intro.badgeBg || 'var(--primary-light)'};color:${intro.badgeColor || 'var(--primary-dark)'}">${intro.badge}</span>` : ''}
        <div class="intro-emoji">${intro.icon ? `<img src="${intro.icon}" alt="" class="intro-icon-img">` : intro.emoji}</div>
        <p class="intro-title">${intro.title}</p>
        <p class="intro-hook">${intro.hook}</p>
        ${checklist ? `<div class="checklist-box"><p class="checklist-label">🔎 결과에서 확인할 내용</p>${checklist}</div>` : ''}
        <button class="btn-next" id="btn-start">${intro.cta || '시작하기 →'}</button>
        <div class="intro-meta-row">
          <span class="intro-meta-chip">📝 ${config.questions.length}문항</span>
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

  // 문항별 dim(하위영역) 태그를 기준으로 영역별 점수를 백분율로 계산
  function computeDimBreakdown() {
    if (!config.dims) return null;
    const sums = {}, counts = {};
    config.questions.forEach((q, i) => {
      if (!q.dim) return;
      const a = answers[i];
      sums[q.dim] = (sums[q.dim] || 0) + (a ? a.score : 0);
      counts[q.dim] = (counts[q.dim] || 0) + 1;
    });
    return Object.keys(config.dims).map(key => ({
      key, label: config.dims[key],
      pct: counts[key] ? Math.round((sums[key] / (counts[key] * 3)) * 100) : 0
    }));
  }

  function renderDimBox(dimData) {
    if (!dimData || sharedTotal !== null) return '';
    return `<div class="dim-box">
      <p class="dim-title">🔎 영역별로 조금 더 자세히 보면</p>
      ${dimData.map(d => `
        <div class="dim-row">
          <div class="dim-row-head"><span>${d.label}</span><span class="dim-row-pct">${d.pct}%</span></div>
          <div class="dim-bar"><div class="dim-bar-fill" data-pct="${d.pct}" style="width:0%"></div></div>
        </div>
      `).join('')}
    </div>`;
  }

  function renderTipsBox(tips) {
    if (!tips || !tips.length) return '';
    return `<div class="tips-box">
      <p class="tips-title">💡 이럴 때 도움이 돼요</p>
      <ul class="tips-list">${tips.map(t => `<li>${t}</li>`).join('')}</ul>
    </div>`;
  }

  // 이 상태/유형일 때 생길 수 있는 어려움 (예상되는 갈등·마찰 상황)
  function renderChallengeBox(challenges) {
    if (!challenges || !challenges.length) return '';
    return `<div class="tips-box tips-box-alert">
      <p class="tips-title">⚡ 이럴 때 어려움이 생길 수 있어요</p>
      <ul class="tips-list">${challenges.map(t => `<li>${t}</li>`).join('')}</ul>
    </div>`;
  }

  function renderScoreResult() {
    const total = sharedTotal !== null ? sharedTotal : answers.reduce((a, b) => a + (b ? b.score : 0), 0);
    const band = config.bands.find(b => total <= b.max) || config.bands[config.bands.length - 1];
    const bandIdx = config.bands.indexOf(band);
    const urgent = bandIdx >= config.bands.length - 2; // 상위 2개 구간(다소 심함/심함)만 CTA를 조금 더 눈에 띄게
    const gaugePct = Math.min(100, Math.round((total / maxScore) * 100));
    const dimData = computeDimBreakdown();
    resultTotalForShare = total;
    Hub.log(sharedTotal !== null ? 'shared_view' : 'test_complete', config.id, `score:${total};band:${band.label}`);

    app.innerHTML = `
      ${sharedTotal !== null ? `<p class="shared-badge">👀 친구가 공유한 결과예요</p>` : ''}
      <div class="result-card ${band.tone || ''}">
        <p class="result-eyebrow">Today's Result</p>
        <div class="result-emoji">${band.emoji}</div>
        <p class="result-band">${band.label}</p>
        <div class="gauge"><div class="gauge-fill" style="width:0%"></div></div>
        <p class="gauge-label">나의 ${config.gaugeLabel || '지수'}: <b>${total} / ${maxScore}</b></p>
        <p class="result-desc">${band.desc}</p>
      </div>
      ${renderDimBox(dimData)}
      ${renderTipsBox(band.tips)}
      ${renderChallengeBox(band.challenges)}
      ${sharedTotal !== null ? `<button class="btn-next" id="btn-try-mine">나도 해보기 →</button>` : ''}
      ${shareResultBlock()}
      <div id="cta-slot"></div>
      ${basisBlock()}
      ${backLink()}
    `;
    requestAnimationFrame(() => {
      const fill = app.querySelector('.gauge-fill');
      if (fill) setTimeout(() => { fill.style.width = gaugePct + '%'; }, 80);
      app.querySelectorAll('.dim-bar-fill').forEach(el => {
        setTimeout(() => { el.style.width = el.getAttribute('data-pct') + '%'; }, 120);
      });
    });
    fitTitleToOneLine(app.querySelector('.result-band'), 22, 14);
    wireResultActions({ emoji: band.emoji, category: config.intro.title, label: band.label, desc: band.desc });
    Hub.renderCTA(document.getElementById('cta-slot'), config.id, urgent);
    const tryBtn = document.getElementById('btn-try-mine');
    if (tryBtn) tryBtn.addEventListener('click', () => {
      history.replaceState(null, '', location.pathname);
      sharedTotal = null; step = 0; answers.fill(null);
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderTypeResult() {
    let winnerKey;
    if (sharedTypeKey !== null) {
      winnerKey = sharedTypeKey;
    } else {
      const tally = {};
      answers.forEach(a => { if (a && a.type) tally[a.type] = (tally[a.type] || 0) + 1; });
      winnerKey = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0];
    }
    const t = config.types[winnerKey];
    resultTypeKeyForShare = winnerKey;
    Hub.log(sharedTypeKey !== null ? 'shared_view' : 'test_complete', config.id, `type:${winnerKey}`);

    const traits = (t.traits || []).map(x => `<div class="type-trait">🔹 ${x}</div>`).join('');
    const matchType = t.match ? config.types[t.match] : null;
    const hardType = t.hardMatch ? config.types[t.hardMatch] : null;

    app.innerHTML = `
      ${sharedTypeKey !== null ? `<p class="shared-badge">👀 친구가 공유한 결과예요</p>` : ''}
      <div class="type-card">
        <div class="cover-sparkle"></div>
        <p class="type-eyebrow">${config.typeEyebrow || 'RESULT TYPE'}</p>
        <div class="type-emoji">${t.emoji}</div>
        <p class="type-title">${t.title}</p>
        <p class="type-desc">${t.desc}</p>
        <div class="type-traits">${traits}</div>
        ${matchType ? `<div class="type-match">✨ 찰떡궁합: ${matchType.emoji} ${matchType.title}</div>` : ''}
        ${hardType ? `<div class="type-match type-match-alert">⚡ 부딪히기 쉬운 유형: ${hardType.emoji} ${hardType.title}</div>` : ''}
      </div>
      ${renderTipsBox(t.tips)}
      ${renderChallengeBox(t.challenges)}
      ${sharedTypeKey !== null ? `<button class="btn-next" id="btn-try-mine">나도 해보기 →</button>` : ''}
      ${shareResultBlock()}
      <div id="cta-slot"></div>
      ${basisBlock()}
      ${backLink()}
    `;
    wireResultActions({ emoji: t.emoji, category: config.intro.title, label: t.title, desc: t.desc });
    fitTitleToOneLine(app.querySelector('.type-title'), 23, 15);
    Hub.renderCTA(document.getElementById('cta-slot'), config.id, false);
    const tryBtn = document.getElementById('btn-try-mine');
    if (tryBtn) tryBtn.addEventListener('click', () => {
      history.replaceState(null, '', location.pathname);
      sharedTypeKey = null; step = 0; answers.fill(null);
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function shareResultBlock() {
    return `<div class="share-row">
      <button class="btn-share" id="btn-share-img">🖼️ 이미지로 공유</button>
      <button class="btn-share-link" id="btn-share-link">🔗 링크로 공유</button>
    </div>`;
  }
  function basisBlock() {
    return `<details class="basis-box"><summary>🔍 이 검사는 어떻게 만들어졌나요?</summary><div class="basis-body">${config.basis}</div></details>`;
  }
  function backLink() {
    return `<a class="back-link" href="../index.html" style="display:block;text-align:center;margin-top:18px;">🌱 다른 검사 더 해보기</a>`;
  }

  // ── 결과 카드 이미지 생성 (Canvas, 서버 불필요) ──────────────
  // 실제로 그리지 않고 줄바꿈 결과만 계산 (카드 높이를 텍스트 양에 맞추기 위해 먼저 필요)
  function measureWrappedLines(ctx, text, maxWidth) {
    const chars = text.split('');
    const lines = [];
    let line = '';
    for (let i = 0; i < chars.length; i++) {
      const testLine = line + chars[i];
      if (ctx.measureText(testLine).width > maxWidth && line) {
        lines.push(line);
        line = chars[i];
      } else {
        line = testLine;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function drawWrappedLines(ctx, lines, x, y, lineHeight) {
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  }

  function generateResultImage({ emoji, category, label, desc }) {
    const W = 1080;
    const measureCanvas = document.createElement('canvas');
    const mctx = measureCanvas.getContext('2d');
    mctx.font = '400 30px sans-serif';
    const descClean = desc.replace(/<[^>]+>/g, '').slice(0, 90);
    const cardX = 60, cardTop = 170, cardW = W - 120;
    const descLines = measureWrappedLines(mctx, descClean, cardW - 120);
    const lineHeight = 44;

    // 결과 라벨(밴드/유형명) 글자 크기 — 길면 한 줄에 맞게 자동으로 줄임
    let labelFontSize = 52;
    const maxLabelWidth = cardW - 200;
    mctx.font = `800 ${labelFontSize}px sans-serif`;
    while (mctx.measureText(label).width > maxLabelWidth && labelFontSize > 28) {
      labelFontSize -= 2;
      mctx.font = `800 ${labelFontSize}px sans-serif`;
    }

    // 카드 안 콘텐츠 배치 기준선(카드 top 기준 상대값)
    const categoryOffset = 90;
    const emojiOffset = 220;
    const labelOffset = 320;
    const descStartOffset = 400;
    const cardBottomPad = 70;

    const descBlockHeight = (descLines.length - 1) * lineHeight;
    const cardH = descStartOffset + descBlockHeight + cardBottomPad;
    const cardBottomY = cardTop + cardH;

    // 하단 CTA 영역
    const ctaGap = 100;
    const ctaLine1Y = cardBottomY + ctaGap;
    const ctaLine2Y = ctaLine1Y + 50;
    const H = ctaLine2Y + 70;

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // 배경 그라데이션
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#6C63FF');
    grad.addColorStop(1, '#FF6B9D');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 은은한 원형 장식
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath(); ctx.arc(W * 0.85, H * 0.1, 160, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(W * 0.08, H * 0.95, 130, 0, Math.PI * 2); ctx.fill();

    // 흰색 카드 (내용 길이에 맞춘 높이)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cardX, cardTop, cardW, cardH, 40);
    else ctx.rect(cardX, cardTop, cardW, cardH);
    ctx.fill();

    // 상단 로고
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = '700 34px sans-serif';
    ctx.fillText('💜 마음카드', W / 2, 100);

    // 카테고리 라벨
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '700 26px sans-serif';
    ctx.fillText(category, W / 2, cardTop + categoryOffset);

    // 이모지
    ctx.font = '110px sans-serif';
    ctx.fillText(emoji, W / 2, cardTop + emojiOffset);

    // 결과 라벨(밴드/유형명)
    ctx.fillStyle = '#211F33';
    ctx.font = `800 ${labelFontSize}px sans-serif`;
    ctx.fillText(label, W / 2, cardTop + labelOffset);

    // 설명 텍스트 (미리 계산해둔 줄)
    ctx.fillStyle = '#6B7280';
    ctx.font = '400 30px sans-serif';
    ctx.textAlign = 'left';
    drawWrappedLines(ctx, descLines, cardX + 60, cardTop + descStartOffset, lineHeight);
    ctx.textAlign = 'center';

    // 하단 CTA
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = '700 32px sans-serif';
    ctx.fillText('나도 해보러 가기 👉', W / 2, ctaLine1Y);
    ctx.font = '700 30px sans-serif';
    ctx.fillText(location.host, W / 2, ctaLine2Y);

    return new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.95));
  }

  function buildShareUrl() {
    const base = location.origin + location.pathname; // 현재 검사 페이지 자체
    if (mode === 'type' && resultTypeKeyForShare) {
      return `${base}?shared=1&type=${encodeURIComponent(resultTypeKeyForShare)}`;
    }
    if (resultTotalForShare !== null) {
      return `${base}?shared=1&score=${resultTotalForShare}`;
    }
    return base; // 안전장치
  }

  function wireResultActions(shareData) {
    const shareUrl = () => buildShareUrl();
    const shareText = () => `[마음카드] ${config.intro.title} 결과: ${shareData.label} ${shareData.emoji}\n나도 해보기 👉 `;

    // 이미지로 공유
    const imgBtn = document.getElementById('btn-share-img');
    if (imgBtn) {
      imgBtn.addEventListener('click', async () => {
        Hub.log('share_click', config.id, 'image');
        imgBtn.disabled = true;
        const originalLabel = imgBtn.textContent;
        imgBtn.textContent = '이미지 만드는 중...';
        try {
          const blob = await generateResultImage(shareData);
          const file = new File([blob], 'mindcheck-result.png', { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: '마음카드', text: shareText() });
          } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'mindcheck-result.png';
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 5000);
            alert('결과 이미지가 저장됐어요! 카톡/인스타에 첨부해서 보내보세요 📷');
          }
        } catch (e) {
          if (e && e.name !== 'AbortError') alert('이미지 생성 중 문제가 생겼어요. 다시 시도해 주세요.');
        } finally {
          imgBtn.disabled = false;
          imgBtn.textContent = originalLabel;
        }
      });
    }

    // 링크로 공유
    const linkBtn = document.getElementById('btn-share-link');
    if (linkBtn) {
      linkBtn.addEventListener('click', async () => {
        Hub.log('share_click', config.id, 'link');
        const text = shareText();
        const url = shareUrl();
        if (navigator.share) {
          try { await navigator.share({ title: '마음카드', text, url }); return; } catch (e) { /* 취소 등 */ }
        }
        try {
          await navigator.clipboard.writeText(text + url);
          alert('링크가 클립보드에 복사됐어요! 친구에게 붙여넣기 해보세요 📋');
        } catch (e) {
          alert(text + url);
        }
      });
    }
  }

  render();
}
