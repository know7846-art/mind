/**
 * 마음이 — 검사 후 궁금한 점을 풀고 상담으로 이어주는 자동 안내 도우미 (규칙 기반, AI 아님)
 * - 입력한 글은 서버로 보내거나 저장하지 않고, 이 파일 안에서 키워드로 답을 고른다.
 * - 센터 정보(전화·카카오톡·온라인 상담 신청·거점)는 hub-core.js의 Hub.CENTER / Hub.LOCATIONS를 그대로 쓴다.
 * - 위기·위험 표현은 다른 모든 안내보다 먼저 검사하고, 센터가 정한 고정 문구(SAFETY_TEXT)로만 안내한다.
 */

// 공백·문장부호를 없애고 비교해서 "죽고 싶어요", "죽고싶어" 같은 변형을 같이 잡는다
function normalize(text) {
  return String(text || '').toLowerCase().replace(/[\s.,!?~…·'"ㅠㅜㅋㅎ]+/g, '');
}

// 일상 과장 표현("배고파 죽겠다", "숙제 끝내고 싶다")은 걸리지 않도록 표현을 좁게 잡았다
const RX = {
  crisis: /자살|자해|죽고싶|죽을래|죽어버리|죽고만싶|죽는게나|죽어야|사라지고싶|사라져버리|없어지고싶|목숨을?(끊|버리)|극단적|삶을끝|생을끝|인생을끝|살기싫|살고싶지|살아갈이유|손목을?(긋|그)|뛰어내리/,
  danger: /성폭|성추행|성희롱|강간|몰카|불법촬영|스토킹|학대|폭행|감금|(아빠|엄마|부모|선생|친구|선배|형|오빠|언니|누나|애들|걔|남친|여친).{0,6}(맞았|맞고|때렸|때려|때리)/,
  bully: /따돌|왕따|학폭|학교폭력|괴롭힘|괴롭혀|괴롭히/,
  who: /넌누구|너누구|누구세요|사람이야|사람이에요|ai야|ai예요|챗봇|로봇/,
  privacy: /비밀|익명|저장|알려지|들키|부모님한테(말|알)|다른사람(이|한테)/,
  apply: /신청|상담사|상담선생님과|예약|온라인상담|상담받고싶|상담하고싶|상담이필요|상담을받고/,
  contact: /상담(은|을|이)?(어떻게|받으려|받는|가능)|어떻게(해야|하면|말해)|어디에말|연결(해|받|되)|도움(받|을받|이필요)|방법/,
  phone: /전화|번호|연락처|통화/,
  kakao: /카톡|카카오|채널|마인드클릭/,
  where: /어디|위치|주소|거점|찾아가|가는길|오시는|가까운|지도|센터(가|는|를|알려|찾|근처|보여)/,
  all: /전체|모든|다보여|전부/,
  hours: /운영시간|몇시|언제(까지|부터|열|해)|주말|평일|영업|상담시간|시간이/,
  cost: /무료|비용|돈|가격|얼마|유료/,
  age: /몇살|나이|대상|누구나|학부모도|보호자도|부모님도/,
  result: /결과|점수|진단|검사가/,
  tests: /마음체크|테스트|무슨검사|어떤검사|검사종류|검사해/,
  guardian: /자녀|우리애|우리아이|아이가|아들|딸이|학부모|부모로서/,
  lonely: /외롭|외로|혼자인|쓸쓸|공허|고립|혼자있/,
  mood: /우울|무기력|불안|잠이안|잠을못|눈물|의욕|아무것도하기싫|공황|무서워/,
  friends: /친구|절교|관계가|싸웠|사이가/,
  school: /학교|공부|성적|시험|숙제|수행|선생님|학원/,
  family: /부모|엄마|아빠|가족|집에서|형제|동생|언니|오빠/,
  work: /취업|직장|알바|회사|진로|퇴사|이직/,
  esteem: /자존감|쓸모없|못난|내가싫|나를싫|나자신이싫|열등/,
  stress: /스트레스|지쳐|지친|번아웃|힘들|버겁|짜증|답답|화가나/,
  thanks: /고마|감사|도움됐|도움이됐/,
  greet: /^(안녕|하이|헬로|반가|처음)/
};

// 센터가 정한 위기 안내 문구 — 임의로 바꾸지 말 것
const SAFETY_TEXT = [
  '지금 많이 힘들고 어려운 시간을 보내고 있군요.',
  '혼자서 감당하기 어려운 마음이 있다면 혼자 견디려고 하지 않아도 괜찮습니다. 여러분의 이야기를 안전하게 나누고 필요한 도움을 받을 수 있는 전문 상담기관이 있습니다.',
  '도움이 필요할 때 아래 기관으로 연락해 주세요.',
  '• 청소년상담전화: 1388 (24시간 상담)',
  '• 긴급한 위험 상황: 109',
  '• 부천시청소년상담복지센터: 032-325-3002',
  '여러분의 안전과 마음을 소중하게 생각합니다. 도움이 필요하다면 주저하지 말고 전문기관에 연락해 주세요.'
].join('\n');

// 사는 곳(구·동네)으로 가까운 거점을 안내 — 동 이름은 헷갈릴 일 없는 것만 넣었다
const AREAS = [
  { label: '원미구', centers: ['원미센터'], rx: /원미|중동|상동|춘의|도당|약대/ },
  { label: '소사구', centers: ['소사센터', '학교밖청소년지원센터'], rx: /소사|송내|범박|괴안|옥길/ },
  { label: '오정구', centers: ['오정센터'], rx: /오정|원종|고강|여월|삼정|대장동/ }
];

// 검사 이름 (검사 결과 화면에서 챗봇으로 넘어올 때 인사에 사용)
const TEST_NAMES = {
  loneliness: '외로움 체크', stress: '스트레스 체크', mood: '마음날씨 체크', love: '연애 스타일',
  esteem: '자존감 체크', burnout: '무기력 체크', jobburnout: '번아웃 검사', tarot: '고민타파 타로'
};

// 센터 정보는 Hub에서 가져온다 (테스트에서는 env를 직접 넘김)
function getEnv(env) {
  if (env) return env;
  if (typeof Hub !== 'undefined') return { CENTER: Hub.CENTER, LOCATIONS: Hub.LOCATIONS, mapSearchUrl: Hub.mapSearchUrl };
  throw new Error('Chatbot.reply: env(CENTER, LOCATIONS)가 필요해요');
}

function buildActions(env) {
  const c = env.CENTER;
  const mapUrl = env.mapSearchUrl || (a => `https://map.kakao.com/?q=${encodeURIComponent(a)}`);
  return {
    online: { label: '📝 온라인 상담 신청하기', href: c.onlineApplyUrl, ext: true },
    kakao: { label: `💬 카카오톡 '${c.kakaoName}'에 문의 남기기`, href: c.kakaoUrl, ext: true },
    center: { label: `📞 센터 전화 (${c.phone})`, href: c.phoneHref },
    helpline: { label: `☎️ 청소년전화 ${c.helpline} (24시간)`, href: c.helplineHref },
    home: { label: '✅ 다른 검사 둘러보기', href: 'index.html' },
    emergency: { label: '🚨 긴급한 위험 상황 (109)', href: 'tel:109', danger: true },
    test: (file, label) => ({ label, href: `tests/${file}.html` }),
    say: (label, say) => ({ label, say }),
    map: loc => ({ label: `🗺️ ${loc.name} 지도 보기`, href: mapUrl(loc.address), ext: true })
  };
}

// AI가 이어서 답하는 말: 마음 이야기와 규칙으로 이해하지 못한 말.
// 위기·위험(safety), 센터 정보(신청·전화·위치·비용 등)는 항상 규칙 기반 안내로만 답한다 — 정확해야 하는 정보이기 때문.
const AI_INTENTS = ['lonely', 'mood', 'esteem', 'friends', 'school', 'family', 'work', 'stress', 'guardian', 'fallback'];

// AI 답변 사용 동의 안내 (개인정보 입력 주의 + 외부 AI 서비스 전송 고지)
const AI_CONSENT_TEXT = [
  'AI 답변을 켜면 지금부터 입력하는 글이 답변을 만들기 위해 외부 AI 서비스(Google Gemini, 미국)로 전송돼요.',
  '센터나 이 사이트에는 대화 내용이 저장되지 않아요. 다만 AI 서비스 쪽에서 일정 기간 보관될 수 있어요.',
  '이름·연락처·학교·주소 같은 개인정보는 적지 마세요. AI 답변은 틀릴 수 있고 상담을 대신하지 않아요.'
].join('\n');

const Chatbot = {
  // 처음 인사 (검사 결과 화면에서 넘어온 경우 어떤 검사였는지 한 줄 덧붙임)
  welcome(fromTestId, aiAvailable) {
    let t = '안녕하세요, 마음이예요 💜\n저는 검사 결과나 상담 연결에 대해 안내해 주는 자동 도우미예요. 사람이 아니라서 실시간 상담은 어렵지만, 상담을 신청하는 방법과 가까운 센터는 알려드릴 수 있어요.\n' + (aiAvailable ? 'AI 답변은 아래에서 켜기를 눌러 동의하면 쓸 수 있어요. 켜기 전까지는 입력한 글이 저장되거나 전송되지 않아요.' : '입력한 글은 저장되거나 전송되지 않아요.');
    if (TEST_NAMES[fromTestId]) t = `'${TEST_NAMES[fromTestId]}' 결과를 보고 오셨네요.\n` + t;
    return t;
  },
  // 위기 안내(고정 문구 + 연락처 버튼) — 서버가 위기 표현을 감지했을 때도 같은 안내를 쓴다
  safety(envArg) {
    const A = buildActions(getEnv(envArg));
    return { intent: 'safety', text: SAFETY_TEXT, actions: [A.helpline, A.emergency, A.center], urgent: true };
  },
  wantsAI(intent) { return AI_INTENTS.includes(intent); },
  // 서버 함수(mindi-chat)에 대화를 보내 AI 답변을 받는다. 실패하면 { ok:false } — 화면에서는 규칙 기반 안내로 대신한다.
  async askAI(messages, cfg) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    try {
      const res = await fetch(cfg.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: cfg.key, Authorization: `Bearer ${cfg.key}` },
        body: JSON.stringify({ messages }),
        signal: ctrl.signal
      });
      if (!res.ok) return { ok: false, reason: 'http_' + res.status };
      const data = await res.json();
      if (!data || typeof data.text !== 'string' || !data.text.trim()) return { ok: false, reason: 'empty' };
      return { ok: true, text: data.text, safety: !!data.safety };
    } catch (e) {
      return { ok: false, reason: e && e.name === 'AbortError' ? 'timeout' : 'network' };
    } finally {
      clearTimeout(timer);
    }
  },
  consentText() { return AI_CONSENT_TEXT; },
  chips() {
    return [
      '상담은 어떻게 받아요?',
      '온라인 상담 신청하고 싶어요',
      '가까운 센터는 어디예요?',
      '전화번호·카카오톡 알려주세요',
      '비용이 드나요?',
      '요즘 마음이 힘들어요'
    ];
  },

  // 입력 글 → { intent, text, actions, urgent }
  // actions: { label, href, ext?, danger? } 이동 버튼  또는  { label, say } 눌러서 바로 말하기 버튼
  reply(text, envArg) {
    const env = getEnv(envArg);
    const c = env.CENTER;
    const A = buildActions(env);
    const n = normalize(text);
    const out = (intent, body, actions, urgent) => ({ intent, text: body, actions: actions || [], urgent: !!urgent });
    const findLoc = name => (env.LOCATIONS || []).find(l => l.name === name);

    // 1) 안전이 최우선 — 위기·위험·괴롭힘 표현은 센터가 정한 고정 문구와 연락처로만 안내한다
    if (RX.crisis.test(n) || RX.danger.test(n) || RX.bully.test(n)) {
      return out('safety', SAFETY_TEXT, [A.helpline, A.emergency, A.center], true);
    }

    // 2) 이 도우미 자체에 대한 질문
    if (RX.who.test(n)) {
      return out('who',
        '저는 \'마음이\'라는 자동 안내 도우미예요. 사람이 아니고, 정해진 안내를 골라서 알려드려요. 그래서 이야기를 깊이 들어드리는 건 어려워요.\n상담 선생님과 이어지는 방법은 얼마든지 알려드릴게요.',
        [A.online, A.kakao]);
    }
    if (RX.privacy.test(n)) {
      return out('privacy',
        '여기에 입력한 글은 저장되거나 어디로도 전송되지 않아요. 화면을 닫으면 사라져요.\n' +
        '실제 상담에서 어떤 이야기가 어디까지 지켜지는지는 상담을 시작할 때 상담 선생님이 직접 설명해 줘요. 미리 궁금하다면 센터에 전화해서 먼저 물어봐도 돼요.',
        [A.center, A.kakao]);
    }

    // 3) 사는 곳(구·동네)을 말하면 가까운 센터를 안내
    const area = AREAS.find(a => a.rx.test(n));
    if (area) {
      const locs = area.centers.map(findLoc).filter(Boolean);
      const lines = locs.map(l => `• ${l.name} — ${l.address}` + (l.badge === '학교밖' ? `\n   (${l.desc})` : ''));
      return out('area',
        `${area.label} 쪽에서는 이곳이 가까워요.\n${lines.join('\n')}\n운영 시간과 상담이 가능한 날은 전화로 먼저 확인해 보세요.`,
        [...locs.map(A.map), A.center, A.online]);
    }

    // 4) 센터 위치 — 원하면 사는 곳으로 안내
    if (RX.where.test(n)) {
      if (RX.all.test(n)) {
        const lines = (env.LOCATIONS || []).map(l => `• ${l.name} — ${l.address}`);
        return out('where_all',
          `부천시청소년상담복지센터 안내 거점이에요.\n${lines.join('\n')}\n운영 시간은 전화로 확인하는 게 가장 정확해요.`,
          [A.center, A.online]);
      }
      return out('where',
        '원하시면 사는 곳을 알려주세요. 구 이름이나 동네 이름이면 돼요 (예: 원미구, 송내동). 가까운 센터를 안내해 드릴게요.',
        [A.say('원미구', '원미구'), A.say('소사구', '소사구'), A.say('오정구', '오정구'), A.say('전체 센터 보기', '모든 센터 보여주세요')]);
    }

    // 5) 상담 연결 — 온라인 상담 신청으로 바로 이어준다 (감정 이야기보다 먼저)
    if (RX.apply.test(n)) {
      return out('apply',
        '온라인 상담 신청은 센터 홈페이지에서 할 수 있어요. 아래 버튼을 누르면 신청 화면으로 바로 이동해요.\n바로 이야기하고 싶다면 전화도 가능해요.',
        [A.online, A.center, A.kakao]);
    }
    if (RX.contact.test(n)) {
      return out('contact',
        '상담은 이렇게 시작할 수 있어요.\n' +
        '① 온라인 상담 신청 — 센터 홈페이지에서 바로 신청해요.\n' +
        `② 카카오톡 '${c.kakaoName}'에 문의 남기기 — 실시간 대화는 아니고, 남겨 주시면 확인 후 답변드려요.\n` +
        `③ 센터 전화 ${c.phone}\n` +
        `④ 청소년전화 ${c.helpline} (24시간)\n` +
        '만 9~24세 상담은 무료예요.',
        [A.online, A.kakao, A.center, A.helpline]);
    }
    if (RX.kakao.test(n)) {
      return out('kakao',
        `카카오톡 채널 '${c.kakaoName}'에서 문의를 남길 수 있어요. 실시간으로 바로 대화하는 곳은 아니고, 남겨 주시면 확인 후 답변드려요.\n상담을 정식으로 신청하려면 온라인 상담 신청이 더 빨라요.`,
        [A.kakao, A.online]);
    }
    if (RX.phone.test(n)) {
      return out('phone',
        `센터 전화는 ${c.phone}, 청소년전화는 ${c.helpline}(24시간)이에요. 누르면 바로 전화가 걸려요.`,
        [A.center, A.helpline, A.kakao]);
    }
    if (RX.hours.test(n)) {
      return out('hours',
        '거점별 운영·상담 시간은 제가 정확히 알고 있지 않아요. 센터에 전화해서 확인하는 게 가장 정확해요.\n' +
        `청소년전화 ${c.helpline}은 24시간 연결돼요.`,
        [A.center, A.helpline]);
    }
    if (RX.cost.test(n)) {
      return out('cost', '만 9~24세 상담은 무료예요. 더 궁금한 점은 센터에 전화로 물어봐 주세요.', [A.online, A.center]);
    }
    if (RX.age.test(n)) {
      return out('age', '상담은 만 9~24세 청(소)년이 대상이에요. 자세한 내용은 센터에 전화로 물어봐 주세요.', [A.center, A.online]);
    }
    if (RX.result.test(n)) {
      return out('result',
        '검사 결과는 진단이 아니라 참고용이에요. 결과가 마음에 걸리거나 더 이야기 나눠 보고 싶다면 상담으로 이어갈 수 있어요.',
        [A.online, A.kakao, A.center]);
    }
    if (RX.tests.test(n)) {
      return out('tests',
        '마음카드에서는 외로움·스트레스·마음날씨 같은 마음 상태를 3분 정도로 가볍게 살펴볼 수 있어요. 진단이 아니라 참고용이에요.',
        [A.home]);
    }

    // 6) 마음 이야기 — 깊이 들어드릴 수 없으니, 공감 한 줄 + 사람과 이어지는 길을 안내
    const toHuman = '이야기를 더 나누고 싶다면 상담 선생님과 이어지는 방법이 있어요.';
    if (RX.guardian.test(n)) {
      return out('guardian',
        '자녀 걱정으로 마음이 무거우시겠어요. 혼자 고민하지 않으셔도 괜찮아요.\n센터에 전화하거나 카카오톡으로 문의를 남겨 보세요.',
        [A.center, A.kakao]);
    }
    if (RX.lonely.test(n)) {
      return out('lonely',
        `외롭다는 마음을 꺼내 줘서 고마워요. 사람들 속에서도 혼자인 것 같은 때가 있죠.\n지금 마음을 살펴보는 외로움 체크도 있고, ${toHuman}`,
        [A.online, A.test('loneliness', '✅ 외로움 체크 해보기'), A.kakao]);
    }
    if (RX.mood.test(n)) {
      return out('mood',
        `마음이 많이 무거웠겠어요. 그런 마음을 느끼는 건 이상한 게 아니에요.\n힘든 감정이 2주 이상 이어진다면 전문가와 이야기해 보는 걸 권해요. ${toHuman}`,
        [A.online, A.test('mood', '🌤️ 마음날씨 체크 해보기'), A.center]);
    }
    if (RX.esteem.test(n)) {
      return out('esteem',
        `스스로가 마음에 들지 않는 날은 정말 힘들죠. 그렇게 느끼는 것과 실제 나의 가치는 달라요.\n${toHuman}`,
        [A.online, A.test('esteem', '✅ 자존감 체크 해보기'), A.kakao]);
    }
    if (RX.friends.test(n)) {
      return out('friends',
        `친구 문제는 마음이 가장 많이 쓰이는 일 중 하나죠. 속상했겠어요.\n혼자 고민하기보다 이야기하면 한결 가벼워지기도 해요. ${toHuman}`,
        [A.online, A.kakao, A.center]);
    }
    if (RX.school.test(n)) {
      return out('school',
        `공부나 학교 일로 마음이 지쳤겠어요. 열심히 하는 만큼 더 힘든 거예요.\n지금 얼마나 지쳤는지 살펴볼 수 있어요. ${toHuman}`,
        [A.online, A.test('stress', '✅ 스트레스 체크 해보기'), A.kakao]);
    }
    if (RX.family.test(n)) {
      return out('family',
        `가족 이야기는 꺼내기 어렵고 마음이 복잡할 때가 많아요. 말해줘서 고마워요.\n${toHuman}`,
        [A.online, A.kakao, A.center]);
    }
    if (RX.work.test(n)) {
      return out('work',
        `일이나 진로 때문에 마음이 무거웠겠어요. 요즘 얼마나 지쳤는지 살펴볼 수 있어요. ${toHuman}`,
        [A.online, A.test('jobburnout', '✅ 번아웃 체크 해보기'), A.kakao]);
    }
    if (RX.stress.test(n)) {
      return out('stress',
        `많이 힘들었겠어요. 이렇게 말해 주는 것만으로도 쉬운 일이 아니에요.\n${toHuman}`,
        [A.online, A.test('stress', '✅ 스트레스 체크 해보기'), A.kakao]);
    }

    // 7) 가벼운 대화
    if (RX.thanks.test(n)) {
      return out('thanks', '도움이 되었다니 다행이에요. 필요할 때 언제든 또 물어보세요 💜');
    }
    if (RX.greet.test(n)) {
      return out('greet', '안녕하세요, 마음이예요 💜 아래 질문을 눌러 보거나, 궁금한 점을 적어 주세요.');
    }

    // 8) 이해하지 못했을 때는 솔직하게
    return out('fallback',
      '죄송해요, 제가 그 말씀은 잘 이해하지 못했어요. 저는 정해진 안내만 할 수 있어요.\n' +
      '상담 신청, 전화·카카오톡, 가까운 센터, 비용에 대해 물어보시거나, 아래에서 바로 연락해 보세요.',
      [A.online, A.kakao, A.center]);
  }
};

// 브라우저에서는 무시되고, Node 테스트 실행기에서만 내보냄
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Chatbot, normalize, RX, SAFETY_TEXT, AI_INTENTS };
}
