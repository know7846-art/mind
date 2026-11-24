// 마음이(규칙 기반 안내 도우미) 답변 선택 로직 테스트 — 네트워크·DOM 없이 순수 함수만 검사
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Chatbot, normalize } = require('../js/chatbot.js');

const ONLINE = 'https://www.bwyf.or.kr/mindclick/addCnsltReqstView.do?reqstType=PERSON';
const env = {
  CENTER: {
    name: '부천시청소년상담복지센터', phone: '032-325-3002', phoneHref: 'tel:032-325-3002',
    helpline: '1388', helplineHref: 'tel:1388', kakaoUrl: 'https://pf.kakao.com/_smsxeK', kakaoName: '마인드클릭',
    onlineApplyUrl: ONLINE
  },
  LOCATIONS: [
    { name: '원미센터', badge: '청소년', address: '부천시 원미구 장말로 107 복사골문화센터 3층', desc: '청소년 대상 거점' },
    { name: '소사센터', badge: '청소년', address: '부천시 소사구 경인로 92번길 33 송내어울마당 5층', desc: '청소년 대상 거점' },
    { name: '오정센터', badge: '청소년', address: '부천시 오정구 소사로 780 원종청소년어울마당', desc: '청소년 대상 거점' },
    { name: '학교밖청소년지원센터', badge: '학교밖', address: '부천시 소사구 경인로 92번길 33 송내어울마당 5층', desc: '학교 밖 청소년과 가족을 위한 상담·자립 지원' }
  ]
};
const reply = (t) => Chatbot.reply(t, env);
const hrefs = (r) => r.actions.map(a => a.href).filter(Boolean);

test('normalize: 공백·문장부호를 없앤다', () => {
  assert.equal(normalize('  죽고 싶어요!! '), '죽고싶어요');
});

test('위기·위험·괴롭힘 표현은 항상 센터 고정 문구와 연락처 3곳으로만 안내한다', () => {
  const samples = ['죽고 싶어요', '자해하고 싶어', '살기 싫어', '아빠한테 맞았어요', '학교폭력 당하고 있어요', '친구들이 왕따시켜요'];
  for (const s of samples) {
    const r = reply(s);
    assert.equal(r.intent, 'safety', s);
    assert.equal(r.urgent, true, s);
    assert.ok(r.text.includes('1388 (24시간 상담)'), s);
    assert.ok(r.text.includes('긴급한 위험 상황: 109'), s);
    assert.ok(r.text.includes('032-325-3002'), s);
    assert.deepEqual(hrefs(r), ['tel:1388', 'tel:109', 'tel:032-325-3002'], s);
  }
});

test('안전 안내는 다른 질문 키워드(상담 신청, 사는 곳)보다 먼저 검사한다', () => {
  assert.equal(reply('상담 받고 싶은데 죽고 싶어요').intent, 'safety');
  assert.equal(reply('원미구에 사는데 살기 싫어요').intent, 'safety');
});

test('일상적인 과장 표현은 안전 안내로 오인하지 않는다', () => {
  for (const s of ['배고파 죽겠다', '숙제 끝내고 싶다', '시험 답이 맞았다', '웃겨 죽겠어']) {
    assert.notEqual(reply(s).intent, 'safety', s);
  }
});

test('상담 방법 질문은 온라인 상담 신청을 가장 먼저 안내한다', () => {
  const r = reply('상담은 어떻게 받아요?');
  assert.equal(r.intent, 'contact');
  assert.ok(r.text.includes('온라인 상담 신청'));
  assert.ok(r.text.includes('실시간 대화는 아니고'));
  assert.equal(r.actions[0].href, ONLINE);
  assert.ok(hrefs(r).includes('https://pf.kakao.com/_smsxeK'));
});

test('상담 신청 의사를 말하면 신청 화면으로 바로 가는 버튼이 첫 번째다', () => {
  for (const s of ['온라인 상담 신청하고 싶어요', '상담사 선생님과 이야기하고 싶어요', '상담 예약하고 싶어요', '친구 때문에 힘들어서 상담받고 싶어요']) {
    const r = reply(s);
    assert.equal(r.intent, 'apply', s);
    assert.equal(r.actions[0].href, ONLINE, s);
    assert.equal(r.actions[0].ext, true, s);
  }
});

test('전화번호·카카오톡·비용 질문', () => {
  assert.equal(reply('전화번호 알려주세요').intent, 'phone');
  assert.equal(reply('카카오톡으로도 되나요').intent, 'kakao');
  assert.equal(reply('비용이 드나요?').intent, 'cost');
  assert.ok(reply('비용이 드나요?').text.includes('만 9~24세 상담은 무료'));
});

test('가까운 센터를 물으면 사는 곳을 되묻고, 구 선택 버튼을 보여준다', () => {
  const r = reply('가까운 센터는 어디예요?');
  assert.equal(r.intent, 'where');
  assert.ok(r.text.includes('사는 곳'));
  assert.deepEqual(r.actions.filter(a => a.say).map(a => a.say).slice(0, 3), ['원미구', '소사구', '오정구']);
});

test('사는 곳(구·동네)을 말하면 가까운 센터와 지도 링크를 안내한다', () => {
  const cases = [['원미구', '원미센터'], ['소사구에 살아요', '소사센터'], ['송내동이에요', '소사센터'], ['오정구', '오정센터'], ['원종동 살아요', '오정센터'], ['중동', '원미센터']];
  for (const [s, center] of cases) {
    const r = reply(s);
    assert.equal(r.intent, 'area', s);
    assert.ok(r.text.includes(center), s);
    assert.ok(r.actions.some(a => a.href && a.href.startsWith('https://map.kakao.com/?q=') && a.label.includes(center)), s);
    assert.ok(hrefs(r).includes('tel:032-325-3002'), s);
    assert.ok(r.text.includes('전화로 먼저 확인'), s);
  }
});

test('소사구는 학교밖청소년지원센터도 함께 안내한다', () => {
  const r = reply('소사구');
  assert.ok(r.text.includes('학교밖청소년지원센터'));
});

test('전체 센터 보기를 누르면 등록된 모든 거점을 보여준다', () => {
  const r = reply('모든 센터 보여주세요');
  assert.equal(r.intent, 'where_all');
  for (const l of env.LOCATIONS) assert.ok(r.text.includes(l.name) && r.text.includes(l.address));
});

test('운영 시간은 모른다고 솔직히 말하고 전화로 안내한다', () => {
  const r = reply('운영시간이 어떻게 돼요?');
  assert.equal(r.intent, 'hours');
  assert.ok(r.text.includes('정확히 알고 있지 않아요'));
});

test('검사 결과 질문은 진단이 아니라고 알리고 상담으로 이어준다', () => {
  const r = reply('검사 결과가 궁금해요');
  assert.equal(r.intent, 'result');
  assert.ok(r.text.includes('진단이 아니라'));
  assert.equal(r.actions[0].href, ONLINE);
});

test('마음 이야기는 먼저 공감과 해볼 수 있는 방법을 알려주고, 상담은 뒤에 선택지로 둔다', () => {
  for (const [s, intent] of [['요즘 너무 외로워요', 'lonely'], ['우울하고 무기력해요', 'mood'], ['시험 때문에 힘들어요', 'school'], ['스트레스 받아요', 'stress']]) {
    const r = reply(s);
    assert.equal(r.intent, intent, s);
    assert.equal(r.urgent, false, s);
    assert.ok(r.text.includes('•'), s + ' — 해볼 수 있는 방법이 있어야 해요');
    assert.notEqual(r.actions[0].href, ONLINE, s + ' — 상담 신청이 첫 버튼이면 안 돼요');
    assert.ok(hrefs(r).includes(ONLINE), s + ' — 상담 신청은 선택지로 남아 있어야 해요');
  }
});

test('상담에 대한 궁금증·오해에는 먼저 설명으로 답한다', () => {
  for (const s of ['상담은 뭐 하는 거예요?', '상담 받으면 부모님이 알아요?', '상담은 이상한 사람만 받는 거 아니에요?']) {
    const r = reply(s);
    assert.equal(r.intent, 'about', s);
    assert.ok(r.text.includes('문제가 있는 사람만 받는 게 아니에요'), s);
  }
});

test('이해하지 못한 말은 fallback으로 솔직하게 답하고 연락처를 보여준다', () => {
  const r = reply('asdf qwer');
  assert.equal(r.intent, 'fallback');
  assert.ok(hrefs(r).includes('tel:032-325-3002'));
});

test('검사 결과 화면에서 넘어오면 어떤 검사였는지 인사에 덧붙인다', () => {
  assert.ok(Chatbot.welcome('loneliness').startsWith("'외로움 체크' 결과를 보고 오셨네요."));
  assert.ok(!Chatbot.welcome('없는검사').includes('결과를 보고 오셨네요'));
  assert.ok(!Chatbot.welcome().includes('결과를 보고 오셨네요'));
});

test('마음서랍 쪽 화면(신청·지역연결·마이)으로 가는 링크는 어떤 답변에도 없다', () => {
  const inputs = ['안녕', '고마워요', '신청하고 싶어요', '검사 결과가 궁금해요', '자녀가 걱정돼요', '넌 누구야', '비밀 지켜지나요', '취업 고민', '자존감이 낮아요', '원미구', '가까운 센터', '', ...Chatbot.chips()];
  for (const s of inputs) {
    const r = reply(s);
    assert.ok(r.text && r.text.length > 0, s);
    for (const a of r.actions) {
      assert.ok(a.label, s);
      assert.ok(a.href || a.say, s);
      if (a.href) assert.ok(!/apply\.html|location\.html|my\.html|record\.html/.test(a.href), s + ' -> ' + a.href);
    }
  }
});
