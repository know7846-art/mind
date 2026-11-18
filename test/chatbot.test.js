// 마음이(규칙 기반 안내 도우미) 답변 선택 로직 테스트 — 네트워크·DOM 없이 순수 함수만 검사
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Chatbot, normalize } = require('../js/chatbot.js');

const env = {
  CENTER: {
    name: '부천시청소년상담복지센터', phone: '032-325-3002', phoneHref: 'tel:032-325-3002',
    helpline: '1388', helplineHref: 'tel:1388', kakaoUrl: 'https://pf.kakao.com/_smsxeK', kakaoName: '마인드클릭'
  },
  LOCATIONS: [
    { name: '원미센터', address: '부천시 원미구 장말로 107 복사골문화센터 3층' },
    { name: '소사센터', address: '부천시 소사구 경인로 92번길 33 송내어울마당 5층' }
  ]
};
const reply = (t) => Chatbot.reply(t, env);
const hrefs = (r) => r.actions.map(a => a.href);

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

test('안전 안내는 다른 질문 키워드보다 먼저 검사한다', () => {
  assert.equal(reply('상담 받고 싶은데 죽고 싶어요').intent, 'safety');
});

test('일상적인 과장 표현은 안전 안내로 오인하지 않는다', () => {
  for (const s of ['배고파 죽겠다', '숙제 끝내고 싶다', '시험 답이 맞았다', '웃겨 죽겠어']) {
    assert.notEqual(reply(s).intent, 'safety', s);
  }
});

test('상담 방법 질문은 연결 방법 4가지를 안내한다', () => {
  const r = reply('상담은 어떻게 받아요?');
  assert.equal(r.intent, 'contact');
  assert.ok(r.text.includes('실시간 대화는 아니고'));
  assert.ok(hrefs(r).includes('https://pf.kakao.com/_smsxeK'));
  assert.ok(hrefs(r).includes('apply.html'));
});

test('감정 이야기와 상담 요청이 함께 오면 연결 안내가 우선한다', () => {
  assert.equal(reply('친구 때문에 힘들어서 상담받고 싶어요').intent, 'contact');
});

test('전화번호·카카오톡·비용 질문', () => {
  assert.equal(reply('전화번호 알려주세요').intent, 'phone');
  assert.equal(reply('카카오톡으로도 되나요').intent, 'kakao');
  assert.equal(reply('비용이 드나요?').intent, 'cost');
  assert.ok(reply('비용이 드나요?').text.includes('만 9~24세 상담은 무료'));
});

test('위치 질문은 등록된 거점을 모두 보여준다', () => {
  const r = reply('가까운 센터는 어디예요?');
  assert.equal(r.intent, 'where');
  for (const l of env.LOCATIONS) assert.ok(r.text.includes(l.name) && r.text.includes(l.address));
});

test('운영 시간은 모른다고 솔직히 말하고 전화로 안내한다', () => {
  const r = reply('운영시간이 어떻게 돼요?');
  assert.equal(r.intent, 'hours');
  assert.ok(r.text.includes('정확히 알고 있지 않아요'));
});

test('마음 이야기는 사람과 이어지는 방법을 안내하고 안전 문구를 대신 쓰지 않는다', () => {
  for (const [s, intent] of [['요즘 너무 외로워요', 'lonely'], ['우울하고 무기력해요', 'mood'], ['시험 때문에 힘들어요', 'school'], ['스트레스 받아요', 'stress']]) {
    const r = reply(s);
    assert.equal(r.intent, intent, s);
    assert.equal(r.urgent, false, s);
    assert.ok(r.actions.length > 0, s);
  }
});

test('이해하지 못한 말은 fallback으로 솔직하게 답하고 연락처를 보여준다', () => {
  const r = reply('asdf qwer');
  assert.equal(r.intent, 'fallback');
  assert.ok(hrefs(r).includes('tel:1388'));
});

test('모든 답변은 텍스트가 있고, 모든 버튼은 label과 href를 가진다', () => {
  const inputs = ['안녕', '고마워요', '신청하고 싶어요', '검사 결과가 궁금해요', '자녀가 걱정돼요', '넌 누구야', '비밀 지켜지나요', '취업 고민', '자존감이 낮아요', ''];
  for (const s of [...inputs, ...Chatbot.chips()]) {
    const r = reply(s);
    assert.ok(r.text && r.text.length > 0, s);
    for (const a of r.actions) assert.ok(a.label && a.href, s);
  }
});
