/* ===================================================
   고민타파 타로 - 메인 로직 v2
   부천시청소년상담복지센터 청소년 타로 프로그램
=================================================== */

// ── 전역 상태 ──────────────────────────────────────
let currentWorry    = '';
let worryTopic      = 'general';   // 고민 주제 (분석 결과)
let drawnCards      = [];
let drawCount       = 0;
let fanShuffled     = [];          // 셔플된 78장 인덱스

// ── DOM 참조 ───────────────────────────────────────
const sections = {
  intro  : document.getElementById('intro-section'),
  worry  : document.getElementById('worry-section'),
  draw   : document.getElementById('draw-section'),
  loading: document.getElementById('loading-section'),
  result : document.getElementById('result-section'),
};

// ── 섹션 전환 ──────────────────────────────────────
function showSection(name) {
  Object.values(sections).forEach(el => el.classList.add('hidden'));
  if (sections[name]) sections[name].classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ──────────────────────────────────────────────────
// ★ 고민 주제 분석 ★
// ──────────────────────────────────────────────────
// 각 주제별 키워드 맵
const TOPIC_MAP = {
  friendship: {
    label: '친구 관계',
    emoji: '👫',
    keywords: ['친구','우정','사이','관계','무리','친하','따돌림','왕따','말','싸움','화해','연락','연락없','멀어','배신','상처','대화','소통','사귀','짝']
  },
  love: {
    label: '감정·연애',
    emoji: '💕',
    keywords: ['좋아','설레','연애','이성','남자','여자','고백','짝사랑','헤어','이별','썸','카톡','연락','차','차였','마음','감정','사랑','그리','그립']
  },
  study: {
    label: '학업·공부',
    emoji: '📚',
    keywords: ['공부','성적','시험','수업','학교','학원','수행','과제','숙제','집중','집중력','점수','성적표','입시','수능','내신','공부법','독서','수학','영어','국어','과학']
  },
  career: {
    label: '진로·꿈',
    emoji: '🌟',
    keywords: ['진로','꿈','장래','직업','직업','대학','전공','미래','목표','하고싶','하고 싶','하고싶은','되고싶','되고 싶','꿈꾸','적성','재능','특기']
  },
  family: {
    label: '가족·가정',
    emoji: '🏠',
    keywords: ['부모','엄마','아빠','가족','형','오빠','언니','누나','동생','집','가정','부부','이혼','싸움','다툼','눈치','눈치보','외롭','혼자']
  },
  stress: {
    label: '스트레스·감정',
    emoji: '😓',
    keywords: ['스트레스','힘들','지쳐','지침','우울','불안','걱정','무기력','아무것도','무섭','두려','외로','외롭','짜증','화나','화가','모르겠','모를','사라지고','죽고싶']
  },
  selfidentity: {
    label: '자아·정체성',
    emoji: '🪞',
    keywords: ['나','자신','자아','정체성','나답','나다운','나는','내가','존재','살아가','목적','이유','왜','가치','소중','자존','자신감','자존감']
  },
};

// 주제별 종합 조언 & 응원 메시지 (고민 텍스트에 맞춤 보간)
const TOPIC_ADVICE = {
  friendship: {
    intro: '지금 친구 관계에서 어려움을 겪고 있군요. 카드들이 이렇게 말하고 있어요.',
    outro: '💛 진정한 우정은 시간이 필요해요. 먼저 손을 내밀기 두렵더라도 진심 어린 한마디가 관계를 바꿀 수 있어요. 당신 곁에 당신을 아끼는 사람이 반드시 있다는 걸 기억해 주세요.',
    maeum: '친구 관계로 마음이 많이 힘들었죠? 마음이가 응원해요. 솔직한 대화 한 번이 생각보다 훨씬 큰 변화를 만들어낸답니다. 당신은 좋은 친구를 받을 자격이 충분히 있어요! 💜',
  },
  love: {
    intro: '감정과 마음의 혼란 속에 있군요. 카드가 당신의 진심을 읽었어요.',
    outro: '💛 지금 느끼는 감정이 설레든, 아프든 모두 소중한 경험이에요. 감정을 억누르지 말고 천천히 자신의 마음을 들여다봐요. 서두르지 않아도 괜찮아요.',
    maeum: '마음이 복잡하고 두근두근하거나 혹은 많이 아팠을 텐데, 그 감정 하나하나가 모두 성장의 씨앗이에요. 마음이도 늘 당신 편이에요! 💜',
  },
  study: {
    intro: '공부와 성적에 대한 고민이 깊군요. 카드가 당신의 노력을 알아봤어요.',
    outro: '💛 성적이 전부가 아니에요. 지금 이 순간 최선을 다하는 당신의 모습이 가장 빛나요. 작은 목표부터 하나씩 달성하다 보면 어느새 큰 산도 넘어있을 거예요.',
    maeum: '공부 때문에 너무 많이 지쳐있진 않나요? 마음이도 알아요. 잠깐 쉬어가는 것도 공부의 일부예요! 오늘 하루 수고했어요. 내일의 당신은 오늘보다 반드시 더 강해질 거예요! 💜',
  },
  career: {
    intro: '앞으로 나아갈 방향을 찾고 있군요. 카드가 당신의 가능성을 봤어요.',
    outro: '💛 지금 당장 진로를 결정하지 않아도 돼요. 다양한 경험을 쌓으면서 조금씩 나를 발견해 가는 과정이 바로 진로 탐색이에요. 서두르지 말고 내 페이스대로 걸어가요.',
    maeum: '꿈을 찾는 여정에서 헤매는 것도 사실 정상이에요! 마음이도 처음엔 몰랐거든요. 다양한 걸 시도해보면서 "아, 이거다!" 하는 순간을 기다려봐요. 당신의 빛나는 순간이 반드시 와요! 💜',
  },
  family: {
    intro: '가족 관계에서 힘든 순간을 보내고 있군요. 카드가 당신의 용기를 응원해요.',
    outro: '💛 가족은 가장 가깝지만 가끔 가장 어렵게 느껴지기도 해요. 지금 느끼는 감정을 억누르지 말고, 신뢰할 수 있는 어른(선생님, 상담사)에게 털어놓아봐요.',
    maeum: '집에서 힘든 일이 있을 때 혼자 감당하려 하지 않아도 돼요. 마음이는 언제나 당신 편이고, 부천시청소년상담복지센터 선생님들도 항상 기다리고 있어요. 연락해봐요! 💜',
  },
  stress: {
    intro: '지금 많이 지치고 힘든 상태군요. 카드가 따뜻하게 당신을 안아줬어요.',
    outro: '💛 지금 이 힘든 감정은 반드시 지나가요. 혼자 다 감당하려 하지 말고 주변에 도움을 요청해봐요. 아무것도 하기 싫은 날엔 쉬는 것도 용기예요.',
    maeum: '지금 많이 지쳐있죠? 그 감정, 참지 않아도 돼요. 마음이가 꼭 안아주고 싶어요 🤗. 힘들면 혼자 버티지 말고 아래 상담 번호로 전화해봐요. 듣기만 해도 훨씬 가벼워질 거예요! 💜',
  },
  selfidentity: {
    intro: '나 자신을 찾고 싶은 마음이 느껴지네요. 카드가 당신의 내면을 비춰줬어요.',
    outro: '💛 나를 알아가는 것은 평생의 여정이에요. 지금 이 시기에 자신을 탐구하는 것 자체가 정말 용감한 일이에요. 천천히, 조급하지 않게 나다운 것을 찾아가봐요.',
    maeum: '"나는 누구지?" 라는 질문을 품고 있는 당신이 마음이는 정말 대단하다고 생각해요. 그 질문에 답을 찾는 과정이 바로 당신만의 이야기예요. 마음이도 응원하고 있을게요! 💜',
  },
  general: {
    intro: '마음 깊은 곳의 고민을 카드가 읽었어요. 지금 이 순간 당신에게 꼭 필요한 메시지예요.',
    outro: '💛 어떤 고민이든 혼자 감당하려 하지 마세요. 타로카드의 메시지를 마음속에 담아두고, 오늘 하루 한 발짝씩 나아가봐요.',
    maeum: '고민이 크든 작든 마음이가 늘 응원해요. 지금 이 순간 용기 내어 고민을 꺼낸 당신이 이미 멋져요! 당신은 충분히 괜찮은 사람이에요. 믿어줘요 💜',
  },
};

// 고민 텍스트 분석 → 주제 반환
function analyzeWorry(text) {
  const lower = text.toLowerCase();
  let maxScore = 0;
  let best = 'general';

  for (const [topic, info] of Object.entries(TOPIC_MAP)) {
    let score = 0;
    info.keywords.forEach(kw => {
      if (lower.includes(kw)) score++;
    });
    if (score > maxScore) {
      maxScore = score;
      best = topic;
    }
  }
  return best;
}

// ──────────────────────────────────────────────────
// ★ 별빛 캔버스 ★
// ──────────────────────────────────────────────────
function initStars() {
  const canvas = document.getElementById('star-canvas');
  const ctx    = canvas.getContext('2d');
  let W, H, stars = [], shootingStars = [];

  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }

  function makeStars(n) {
    stars = [];
    for (let i = 0; i < n; i++) {
      stars.push({
        x: Math.random()*W, y: Math.random()*H,
        r: Math.random()*1.8+0.2,
        a: Math.random(),
        da: (Math.random()*0.008+0.003) * (Math.random()<.5?1:-1),
        color: Math.random()<.15?'#fde68a': Math.random()<.1?'#67e8f9':'#ffffff'
      });
    }
  }

  function addShootingStar() {
    shootingStars.push({
      x: Math.random()*W*.6, y: Math.random()*H*.4,
      len: Math.random()*120+60, speed: Math.random()*8+5, a:1,
      angle: Math.PI/4+(Math.random()-.5)*.4
    });
  }

  function draw() {
    ctx.clearRect(0,0,W,H);
    stars.forEach(s => {
      s.a += s.da;
      if(s.a>1||s.a<0) s.da=-s.da;
      ctx.save(); ctx.globalAlpha=Math.max(0,Math.min(1,s.a));
      ctx.fillStyle=s.color; ctx.shadowColor=s.color; ctx.shadowBlur=s.r*3;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill(); ctx.restore();
    });
    shootingStars = shootingStars.filter(ss=>ss.a>0);
    shootingStars.forEach(ss => {
      ctx.save(); ctx.globalAlpha=ss.a;
      const g=ctx.createLinearGradient(ss.x,ss.y,ss.x-Math.cos(ss.angle)*ss.len,ss.y-Math.sin(ss.angle)*ss.len);
      g.addColorStop(0,'#fde68a'); g.addColorStop(1,'transparent');
      ctx.strokeStyle=g; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(ss.x,ss.y);
      ctx.lineTo(ss.x-Math.cos(ss.angle)*ss.len,ss.y-Math.sin(ss.angle)*ss.len);
      ctx.stroke(); ctx.restore();
      ss.x+=Math.cos(ss.angle)*ss.speed; ss.y+=Math.sin(ss.angle)*ss.speed; ss.a-=0.018;
    });
    requestAnimationFrame(draw);
  }

  resize(); makeStars(200); draw();
  setInterval(addShootingStar,3500);
  window.addEventListener('resize',()=>{resize();makeStars(200);});
}

// ──────────────────────────────────────────────────
// ★ 파티클 버스트 ★
// ──────────────────────────────────────────────────
function burstParticles(x,y) {
  const colors=['#f4c430','#a855f7','#67e8f9','#f472b6','#fde68a'];
  const c=document.createElement('div');
  c.style.cssText='position:fixed;top:0;left:0;pointer-events:none;z-index:9999;';
  document.body.appendChild(c);
  for(let i=0;i<20;i++){
    const p=document.createElement('div');
    const angle=(Math.PI*2/20)*i;
    const dist=Math.random()*100+50;
    p.style.cssText=`position:absolute;left:${x}px;top:${y}px;
      width:${Math.random()*7+4}px;height:${Math.random()*7+4}px;border-radius:50%;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      --tx:${Math.cos(angle)*dist}px;--ty:${Math.sin(angle)*dist}px;
      animation:particleAnim 1.2s ease-out forwards;`;
    c.appendChild(p);
  }
  if(!document.getElementById('particle-style')){
    const s=document.createElement('style'); s.id='particle-style';
    s.textContent='@keyframes particleAnim{0%{transform:translate(0,0) scale(1);opacity:1;}100%{transform:translate(var(--tx),var(--ty)) scale(0);opacity:0;}}';
    document.head.appendChild(s);
  }
  setTimeout(()=>c.remove(),1400);
}

// ──────────────────────────────────────────────────
// ★ 부채형 카드 덱 생성 ★
// ──────────────────────────────────────────────────
function buildFanDeck() {
  const fanEl  = document.getElementById('fan-deck');
  fanEl.innerHTML = '';

  // 78장 셔플
  fanShuffled = [...Array(78).keys()].sort(() => Math.random() - 0.5);

  const total      = 78;
  const vw         = window.innerWidth;
  const isMobile   = vw < 600;
  const isTablet   = vw >= 600 && vw < 1024;

  // 반응형 카드 크기
  const cardW      = isMobile ? 44 : (isTablet ? 56 : 68);
  const cardH      = isMobile ? 68 : (isTablet ? 88 : 108);

  // 부채 파라미터
  const fanWidth   = Math.min(vw - 32, 900);
  const totalAngle = isMobile ? 150 : 140;     // 전체 부채 각도 (도)
  const startAngle = -totalAngle / 2;
  const step       = totalAngle / (total - 1);

  // 반지름: 화면 크기에 비례
  const radius     = isMobile ? 400 : (isTablet ? 540 : 660);

  // 덱 높이 계산: 부채 호의 보이는 부분 + 여유
  const maxAngleRad = (totalAngle / 2) * Math.PI / 180;
  const arcHeight   = radius - radius * Math.cos(maxAngleRad);
  const fanHeight   = Math.max(arcHeight + cardH * 0.6, isMobile ? 200 : 280);

  fanEl.style.width  = fanWidth + 'px';
  fanEl.style.height = fanHeight + 'px';

  // 중심점 (x, y) — 부채 호의 중심 (카드 아래쪽 바깥)
  const cx = fanWidth / 2;
  const cy = fanHeight + radius * 0.88;

  fanShuffled.forEach((cardIdx, i) => {
    const card  = TAROT_CARDS[cardIdx];
    const angleDeg  = startAngle + step * i;
    const angleRad  = (angleDeg * Math.PI) / 180;

    // 카드 중심 위치 계산 (호 위 배치)
    const x = cx + radius * Math.sin(angleRad) - cardW / 2;
    const y = cy - radius * Math.cos(angleRad) - cardH;

    const el = document.createElement('div');
    el.className = 'fan-card';
    el.dataset.idx    = i;
    el.dataset.cardId = card.id;
    el.title          = '카드를 선택하세요';

    // CSS 변수로 기본 transform 저장 (hover 시 translateY 추가에 사용)
    const baseTransform = `rotate(${angleDeg}deg)`;
    el.style.cssText = `
      left:${x}px; top:${y}px; width:${cardW}px; height:${cardH}px;
      z-index:${i+1};
      transform: ${baseTransform};
      --base-transform: ${baseTransform};
      animation: fanCardAppear 0.6s ${i * 0.008}s ease both;
    `;

    // 카드 뒷면 디자인
    el.innerHTML = `<div class="fan-card-inner">🔮</div>`;
    el.addEventListener('click', onFanCardClick);
    fanEl.appendChild(el);
  });
}

// 카드 클릭 핸들러
function onFanCardClick(e) {
  if (drawCount >= 3) return;
  if (this.classList.contains('selected') || this.classList.contains('disabled')) return;

  const cardId   = parseInt(this.dataset.cardId);
  const card     = TAROT_CARDS.find(c => c.id === cardId);
  if (!card) return;

  // 중복 체크
  if (drawnCards.some(c => c.id === cardId)) return;

  burstParticles(e.clientX, e.clientY);

  // 선택 표시
  this.classList.add('selected');
  this.innerHTML = `
    <div class="fan-card-inner" style="font-size:1.1rem;flex-direction:column;gap:2px;">
      <span>${card.emoji}</span>
      <span style="font-size:.5rem;color:#fde68a;line-height:1.1;text-align:center;">${card.name}</span>
    </div>`;

  drawnCards.push(card);
  drawCount++;

  fillSlot(drawCount - 1, card);
  updateDrawProgress();

  if (drawCount === 3) {
    // 나머지 카드 비활성화
    document.querySelectorAll('.fan-card:not(.selected)').forEach(el => el.classList.add('disabled'));
    document.getElementById('btn-see-result').classList.remove('hidden');
    document.getElementById('fan-hint').textContent = '🌟 3장 모두 선택됐어요! 결과 보기를 눌러주세요.';
    document.getElementById('fan-hint').style.color = 'var(--cyan)';
    document.getElementById('fan-hint').style.animationPlayState = 'paused';
    document.getElementById('fan-hint').style.opacity = '1';
  } else {
    document.getElementById('fan-hint').textContent =
      `✨ ${3 - drawCount}장 더 선택해주세요`;
  }
}

// 슬롯 초기화
function resetSlots() {
  for (let i = 0; i < 3; i++) {
    const s = document.getElementById(`slot-${i}`);
    if (!s) continue;
    s.classList.remove('filled');
    s.innerHTML = `<span class="slot-empty-icon">✦</span>`;
  }
}

// 슬롯 채우기
function fillSlot(index, card) {
  const slot = document.getElementById(`slot-${index}`);
  if (!slot) return;
  slot.classList.add('filled');

  const suitLabel = {
    major:'메이저', cups:'🌊 컵', wands:'🔥 완드', swords:'⚔️ 소드', pentacles:'🌱 펜타클'
  }[card.suit] || card.suit;

  slot.innerHTML = `
    <div class="mini-card-content">
      <span class="mini-card-emoji">${card.emoji}</span>
      <div class="mini-card-name">${card.name}</div>
      <div class="mini-card-suit">${suitLabel}</div>
    </div>`;
}

// 진행도 업데이트
function updateDrawProgress() {
  document.getElementById('draw-count').textContent = drawCount;
  document.getElementById('remaining-count').textContent = 78 - drawCount;
  const stars = document.querySelectorAll('#draw-section .progress-star');
  stars.forEach((s, i) => s.classList.toggle('active', i < drawCount));
}

// ──────────────────────────────────────────────────
// ★ 버튼 이벤트 연결 ★
// ──────────────────────────────────────────────────

// ① 인트로 → 고민 입력
document.getElementById('btn-start').addEventListener('click', function(e) {
  burstParticles(e.clientX, e.clientY);
  setTimeout(() => showSection('worry'), 200);
});

// ② 글자 수 카운터
const worryInput  = document.getElementById('worry-input');
const charCounter = document.getElementById('char-count');
worryInput.addEventListener('input', function() {
  const len = this.value.length;
  charCounter.textContent = `${len} / 200자`;
  if (len > 200) this.value = this.value.substring(0, 200);
});

// ③ 고민 확인 → 카드 뽑기 화면
document.getElementById('btn-go-draw').addEventListener('click', function(e) {
  const worry = worryInput.value.trim();
  if (!worry) {
    worryInput.style.borderColor = 'rgba(244,100,100,.8)';
    worryInput.placeholder = '고민을 먼저 입력해 주세요 💜';
    worryInput.focus();
    setTimeout(() => { worryInput.style.borderColor = ''; }, 2000);
    return;
  }
  currentWorry = worry;
  worryTopic   = analyzeWorry(worry);

  // 주제 태그 표시
  const topicInfo = TOPIC_MAP[worryTopic] || { label:'일반', emoji:'💬' };
  const tagEl = document.getElementById('worry-topic-tag');
  if (tagEl) {
    tagEl.textContent = `${topicInfo.emoji} ${topicInfo.label} 관련 고민으로 분석됐어요`;
    tagEl.classList.remove('hidden');
  }

  burstParticles(e.clientX, e.clientY);

  // 카드 뽑기 초기화
  drawnCards = []; drawCount = 0;
  resetSlots(); updateDrawProgress();
  document.getElementById('btn-see-result').classList.add('hidden');
  document.getElementById('fan-hint').textContent = '✨ 원하는 카드 위에 마우스를 올리고 클릭하세요';
  document.getElementById('fan-hint').style.color = '';
  document.getElementById('fan-hint').style.animationPlayState = '';
  document.getElementById('fan-hint').style.opacity = '';

  setTimeout(() => {
    showSection('draw');
    buildFanDeck();
  }, 200);
});

// ④ 고민 수정 버튼
document.getElementById('btn-back-worry').addEventListener('click', () => showSection('worry'));

// ⑤ 결과 보기 버튼
document.getElementById('btn-see-result').addEventListener('click', function(e) {
  burstParticles(e.clientX, e.clientY);
  showSection('loading');

  const msgs = [
    '✨ 별자리가 정렬되고 있어요...',
    '🔮 카드의 에너지를 읽는 중...',
    '🌙 우주가 당신의 고민을 듣고 있어요...',
    '💫 신비로운 메시지를 불러오는 중...',
    '⭐ 거의 다 됐어요!'
  ];
  let mi = 0;
  const loadingEl  = document.getElementById('loading-msg');
  const msgInterval = setInterval(() => {
    loadingEl.textContent = msgs[mi % msgs.length]; mi++;
  }, 600);

  setTimeout(() => {
    clearInterval(msgInterval);
    buildResult();
    showSection('result');
  }, 3000);
});

// ──────────────────────────────────────────────────
// ★ 결과 화면 생성 ★
// ──────────────────────────────────────────────────
function buildResult() {
  // 고민 & 주제 표시
  document.getElementById('result-worry-text').textContent = `"${currentWorry}"`;

  const topicInfo  = TOPIC_MAP[worryTopic] || { label:'일반', emoji:'💬' };
  const topicTagEl = document.getElementById('result-topic-tag');
  if (topicTagEl) {
    topicTagEl.textContent = `${topicInfo.emoji} ${topicInfo.label}`;
    topicTagEl.classList.remove('hidden');
  }

  // 카드 3장 렌더링
  const grid = document.getElementById('result-cards-grid');
  grid.innerHTML = '';

  drawnCards.forEach((card, idx) => {
    const pos  = CARD_POSITIONS[idx];
    const item = document.createElement('div');
    item.className = 'result-card-item';

    const suitName = {
      major:'🔮 메이저', cups:'🌊 컵', wands:'🔥 완드',
      swords:'⚔️ 소드', pentacles:'🌱 펜타클'
    }[card.suit];

    item.innerHTML = `
      <div class="result-position-label">
        <span class="position-emoji">${pos.emoji}</span>
        <div class="position-name">${pos.name}</div>
        <div class="position-desc">${pos.description}</div>
      </div>
      <div class="result-tarot-card">
        <span class="card-suit-badge badge-${card.suit}">${suitName}</span>
        <span class="card-emoji-big">${card.emoji}</span>
        <div class="card-name-kr">${card.number}. ${card.name}</div>
        <div class="card-name-en">${card.nameEn}</div>
        <div class="card-keywords">
          ${card.keywords.map(k=>`<span class="keyword-tag">${k}</span>`).join('')}
        </div>
        <div class="card-short-msg">${card.shortMsg}</div>
      </div>`;
    grid.appendChild(item);
  });

  buildTotalAdvice();
  updateConsultBanner();
}

// ──────────────────────────────────────────────────
// ★ 상담 배너 문구 주제 연동 ★
// ──────────────────────────────────────────────────
const CONSULT_TEXT = {
  friendship: {
    title: '친구 문제, 혼자 고민하지 않아도 돼요 💜',
    desc:  '친구 관계가 너무 힘들 때, 전문 상담사 선생님이 함께 방법을 찾아드려요.\n말하기 어려운 이야기도 괜찮아요. 비밀이 보장돼요. 🌟'
  },
  love: {
    title: '복잡한 감정, 털어놓고 싶을 때 연락해요 💜',
    desc:  '설레거나 아프거나, 감정이 너무 복잡할 때 전문 선생님과 이야기해 봐요.\n내 마음을 이해하는 데 도움을 드릴게요. 🌟'
  },
  study: {
    title: '공부 스트레스가 너무 크다면 도움을 받아봐요 💜',
    desc:  '성적, 학업, 미래에 대한 불안이 쌓일 때 혼자 버티지 마세요.\n상담 선생님이 함께 방법을 찾아드릴게요. 🌟'
  },
  career: {
    title: '진로 고민, 함께 이야기해봐요 💜',
    desc:  '내가 뭘 원하는지 모르겠을 때, 전문 선생님과 차분히 이야기해봐요.\n다양한 길을 함께 탐색할 수 있어요. 🌟'
  },
  family: {
    title: '가족 문제가 너무 힘들다면 꼭 연락해요 💜',
    desc:  '가정에서 어려움을 겪을 때, 전문 상담사 선생님이 도움의 손길을 드려요.\n혼자 감당하지 않아도 돼요. 🌟'
  },
  stress: {
    title: '많이 지치고 힘들다면 지금 바로 전화해요 💜',
    desc:  '아무것도 하기 싫고 너무 힘들 때, 전문 상담사가 곁에 있을게요.\n말 한마디가 큰 힘이 될 거예요. 언제든지 환영해요. 🌟'
  },
  selfidentity: {
    title: '나를 알고 싶을 때, 함께 이야기해봐요 💜',
    desc:  '내가 누구인지, 뭘 원하는지 혼란스러울 때 전문 선생님과 대화해 봐요.\n당신만의 답을 함께 찾아갈게요. 🌟'
  },
  general: {
    title: '타로카드로도 해결되지 않는 고민이 있나요? 💜',
    desc:  '깊은 고민이나 혼자 해결하기 어려운 문제는\n전문 상담사 선생님과 직접 이야기해 보세요.\n당신의 이야기를 경청하고, 함께 해결책을 찾아드릴게요. 🌟'
  }
};

function updateConsultBanner() {
  const data = CONSULT_TEXT[worryTopic] || CONSULT_TEXT.general;
  const titleEl = document.getElementById('consult-title-text');
  const descEl  = document.getElementById('consult-desc-text');
  if (titleEl) titleEl.textContent = data.title;
  if (descEl)  descEl.innerHTML = data.desc.replace(/\n/g, '<br/>');
}

// ──────────────────────────────────────────────────
// ★ 종합 조언 + 마음이 응원메시지 (주제 연동) ★
// ──────────────────────────────────────────────────
function buildTotalAdvice() {
  const list       = document.getElementById('advice-list');
  const topicData  = TOPIC_ADVICE[worryTopic] || TOPIC_ADVICE.general;
  const topicInfo  = TOPIC_MAP[worryTopic]    || { label:'일반', emoji:'💬' };
  list.innerHTML   = '';

  // 주제 인트로 문구 삽입
  const introItem = document.createElement('li');
  introItem.className = 'advice-item advice-intro';
  introItem.style.cssText = 'border-left-color:var(--bright-purple);background:rgba(168,85,247,.08);';
  introItem.innerHTML = `
    <span class="advice-pos-emoji">${topicInfo.emoji}</span>
    <div>
      <div class="advice-card-ref" style="color:var(--bright-purple);">${topicInfo.label} 관련 고민 — 카드의 이야기</div>
      <div class="advice-text" style="color:var(--silver);font-style:italic;">${topicData.intro}</div>
    </div>`;
  list.appendChild(introItem);

  // 카드별 조언 (3장)
  drawnCards.forEach((card, idx) => {
    const pos  = CARD_POSITIONS[idx];
    const item = document.createElement('li');
    item.className = 'advice-item';
    item.innerHTML = `
      <span class="advice-pos-emoji">${pos.emoji}</span>
      <div>
        <div class="advice-card-ref">${pos.name} — ${card.name} (${card.nameEn})</div>
        <div class="advice-text">${card.advice}</div>
      </div>`;
    list.appendChild(item);
  });

  // 주제 아웃트로 (종합 조언)
  const outroItem = document.createElement('li');
  outroItem.className = 'advice-item';
  outroItem.style.cssText = 'border-left-color:var(--gold);background:rgba(244,196,48,.07);animation-delay:1.5s;';
  outroItem.innerHTML = `
    <span class="advice-pos-emoji">✨</span>
    <div>
      <div class="advice-card-ref" style="color:var(--gold);">📜 종합 조언</div>
      <div class="advice-text">${topicData.outro}</div>
    </div>`;
  list.appendChild(outroItem);

  // 마음이 응원 메시지 (고민 주제에 맞춤)
  const maeumItem = document.createElement('li');
  maeumItem.className = 'advice-item advice-maeum';
  maeumItem.style.cssText = 'border-left-color:var(--pink);background:rgba(244,114,182,.08);animation-delay:1.9s;';
  maeumItem.innerHTML = `
    <span class="advice-pos-emoji">🤍</span>
    <div>
      <div class="advice-card-ref" style="color:var(--pink);">💌 마음이의 응원 메시지</div>
      <div class="advice-text maeum-msg">${topicData.maeum}</div>
    </div>`;
  list.appendChild(maeumItem);
}

// ──────────────────────────────────────────────────
// ★ 다시 하기 버튼 ★
// ──────────────────────────────────────────────────
document.getElementById('btn-retry').addEventListener('click', () => {
  worryInput.value = '';
  charCounter.textContent = '0 / 200자';
  currentWorry = ''; worryTopic = 'general';
  drawnCards = []; drawCount = 0;
  resetSlots(); updateDrawProgress();
  document.getElementById('btn-see-result').classList.add('hidden');
  const tagEl = document.getElementById('worry-topic-tag');
  if (tagEl) tagEl.classList.add('hidden');
  showSection('intro');
});

document.getElementById('btn-new-draw').addEventListener('click', () => {
  drawnCards = []; drawCount = 0;
  resetSlots(); updateDrawProgress();
  document.getElementById('btn-see-result').classList.add('hidden');
  document.getElementById('fan-hint').textContent = '✨ 원하는 카드 위에 마우스를 올리고 클릭하세요';
  document.getElementById('fan-hint').style.color = '';
  document.getElementById('fan-hint').style.animationPlayState = '';
  document.getElementById('fan-hint').style.opacity = '';
  showSection('draw');
  buildFanDeck();
});

// 리사이즈 시 팬 덱 재빌드
window.addEventListener('resize', () => {
  if (!sections.draw.classList.contains('hidden')) buildFanDeck();
});

// ── 초기 실행 ──────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  initStars();
  showSection('intro');
});
