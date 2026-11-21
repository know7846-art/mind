// 마음이 AI 답변 — 서버 함수 로직(supabase/functions/mindi-chat/logic.mjs)과 화면 쪽 호출(Chatbot.askAI) 테스트
// 실제 AI·네트워크는 쓰지 않는다.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { Chatbot, RX, SAFETY_TEXT, AI_INTENTS } = require('../js/chatbot.js');

const LOGIC = pathToFileURL(path.join(__dirname, '..', 'supabase', 'functions', 'mindi-chat', 'logic.mjs')).href;
const load = () => import(LOGIC);

test('위기·위험 표현 목록과 고정 안내 문구가 챗봇(화면)과 서버 함수에서 똑같다', async () => {
  const L = await load();
  for (const k of ['crisis', 'danger', 'bully']) assert.equal(L.RX_SAFETY[k].source, RX[k].source, k);
  assert.equal(L.SAFETY_TEXT, SAFETY_TEXT);
});

test('서버 함수: 위기·위험 표현은 AI로 보내지 않고 감지한다', async () => {
  const L = await load();
  for (const s of ['죽고 싶어요', '자해하고 싶어', '아빠한테 맞았어요', '학교폭력 당하고 있어요']) assert.equal(L.isSafety(s), true, s);
  for (const s of ['배고파 죽겠다', '숙제 끝내고 싶다', '요즘 외로워요', '시험 때문에 힘들어요']) assert.equal(L.isSafety(s), false, s);
});

test('서버 함수: 요청 검증 — 정상 요청은 통과하고 잘못된 요청은 거절한다', async () => {
  const L = await load();
  assert.equal(L.validateMessages(null).ok, false);
  assert.equal(L.validateMessages({ messages: [] }).ok, false);
  assert.equal(L.validateMessages({ messages: [{ role: 'system', content: 'x' }] }).ok, false);
  assert.equal(L.validateMessages({ messages: [{ role: 'user', content: 123 }] }).ok, false);
  assert.equal(L.validateMessages({ messages: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }] }).ok, false); // 마지막이 user가 아님
  const ok = L.validateMessages({ messages: [{ role: 'assistant', content: '인사' }, { role: 'user', content: ' 요즘 외로워요 ' }] });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.messages, [{ role: 'user', content: '요즘 외로워요' }]); // 앞의 assistant는 버리고, 공백은 다듬는다
});

test('서버 함수: 길이 제한(메시지 수·글자 수)을 지킨다', async () => {
  const L = await load();
  const long = L.validateMessages({ messages: [{ role: 'user', content: 'ㅁ'.repeat(2000) }] });
  assert.equal(long.messages[0].content.length, L.LIMITS.maxChars);
  const many = [];
  for (let i = 0; i < 30; i++) many.push({ role: i % 2 ? 'assistant' : 'user', content: '안녕' + i });
  many.push({ role: 'user', content: '마지막' });
  const v = L.validateMessages({ messages: many });
  assert.equal(v.ok, true);
  assert.ok(v.messages.length <= L.LIMITS.maxMessages);
  assert.equal(v.messages[v.messages.length - 1].content.endsWith('마지막'), true);
  for (let i = 1; i < v.messages.length; i++) assert.notEqual(v.messages[i].role, v.messages[i - 1].role); // user/assistant가 번갈아 온다
});

test('서버 함수: AI 답변에 지어낸 전화번호·주소가 섞이면 버린다', async () => {
  const L = await load();
  assert.equal(L.sanitizeReply('많이 힘들었겠어요. 청소년전화 1388로 이야기해 보세요.'), '많이 힘들었겠어요. 청소년전화 1388로 이야기해 보세요.');
  assert.ok(L.sanitizeReply('센터 전화는 032-325-3002예요.'));
  assert.equal(L.sanitizeReply('센터 전화는 02-123-4567이에요.'), null);
  assert.equal(L.sanitizeReply('학교폭력 신고는 117이에요.'), null);
  assert.equal(L.sanitizeReply('자세한 건 https://example.com 에서 보세요.'), null);
  assert.equal(L.sanitizeReply('www.example.com 참고하세요'), null);
  assert.equal(L.sanitizeReply('   '), null);
});

test('서버 함수: AI 답변의 마크다운 표시는 걷어낸다', async () => {
  const L = await load();
  assert.equal(L.sanitizeReply('**힘들었겠어요.**\n- 천천히 쉬어요'), '힘들었겠어요.\n천천히 쉬어요');
});

test('서버 함수: 지침(system prompt)에 쓴 번호는 모두 허용 목록 안에 있고, AI·한계를 밝힌다', async () => {
  const L = await load();
  // '300자 이내' 같은 글자 수 안내는 전화번호가 아니므로 제외
  const nums = (L.SYSTEM_PROMPT.match(/\d+(?:-\d+)+|\d{3,}/g) || []).filter(n => n !== '300');
  for (const n of nums) assert.ok(['032-325-3002', '1388', '109'].includes(n), '허용 목록 밖의 번호: ' + n);
  assert.ok(L.SYSTEM_PROMPT.includes('AI이며 사람 상담사가 아닙니다'));
  assert.ok(L.SYSTEM_PROMPT.includes('진단'));
  const req = L.buildRequest([{ role: 'user', content: '안녕' }, { role: 'assistant', content: '반가워요' }, { role: 'user', content: '힘들어' }], 'gemini-2.5-flash');
  assert.ok(req.generationConfig.maxOutputTokens <= 1000);
  assert.equal(req.systemInstruction.parts[0].text, L.SYSTEM_PROMPT);
  assert.deepEqual(req.contents.map(c => c.role), ['user', 'model', 'user']);
  assert.equal(req.contents[2].parts[0].text, '힘들어');
  assert.deepEqual(req.generationConfig.thinkingConfig, { thinkingBudget: 0 });
  assert.equal(L.buildRequest([{ role: 'user', content: '안녕' }], 'gemini-3-flash').generationConfig.thinkingConfig, undefined);
  // 응답 읽기: 정상 / 차단 / 빈 응답
  assert.equal(L.readReply({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '많이 ' }, { text: '힘들었겠어요' }] } }] }), '많이 힘들었겠어요');
  assert.equal(L.readReply({ candidates: [{ finishReason: 'SAFETY', content: { parts: [{ text: 'x' }] } }] }), '');
  assert.equal(L.readReply({ promptFeedback: { blockReason: 'SAFETY' } }), '');
  assert.equal(L.safeModel('gemini-2.5-flash', 'd'), 'gemini-2.5-flash');
  assert.equal(L.safeModel('../../evil?x=1', 'd'), 'd');
});

test('AI가 답하는 말은 마음 이야기와 이해하지 못한 말뿐이다 — 위기·센터 정보는 항상 규칙 기반', () => {
  for (const intent of ['safety', 'apply', 'contact', 'kakao', 'phone', 'hours', 'cost', 'age', 'area', 'where', 'where_all', 'result', 'privacy', 'who']) {
    assert.equal(Chatbot.wantsAI(intent), false, intent);
  }
  for (const intent of ['lonely', 'mood', 'stress', 'friends', 'fallback']) assert.equal(Chatbot.wantsAI(intent), true, intent);
  assert.ok(!AI_INTENTS.includes('safety'));
});

function withFetch(impl, fn) {
  const saved = global.fetch;
  global.fetch = impl;
  return Promise.resolve(fn()).finally(() => { global.fetch = saved; });
}
const cfg = { url: 'https://example.test/functions/v1/mindi-chat', key: 'anon-key' };

test('askAI: 정상 응답이면 글을 돌려주고, 인증 헤더와 대화를 함께 보낸다', async () => {
  let seen;
  await withFetch(async (url, opts) => {
    seen = { url, opts };
    return { ok: true, status: 200, json: async () => ({ text: 'AI 답변이에요' }) };
  }, async () => {
    const r = await Chatbot.askAI([{ role: 'user', content: '요즘 외로워요' }], cfg);
    assert.deepEqual(r, { ok: true, text: 'AI 답변이에요', safety: false });
    assert.equal(seen.url, cfg.url);
    assert.equal(seen.opts.headers.apikey, 'anon-key');
    assert.equal(seen.opts.headers.Authorization, 'Bearer anon-key');
    assert.deepEqual(JSON.parse(seen.opts.body), { messages: [{ role: 'user', content: '요즘 외로워요' }] });
  });
});

test('askAI: 서버가 위기로 판단해 고정 문구를 보내면 safety 표시를 함께 돌려준다', async () => {
  await withFetch(async () => ({ ok: true, status: 200, json: async () => ({ safety: true, text: '고정 문구' }) }), async () => {
    const r = await Chatbot.askAI([{ role: 'user', content: 'x' }], cfg);
    assert.equal(r.ok, true);
    assert.equal(r.safety, true);
  });
});

test('askAI: 서버 오류·네트워크 오류·빈 응답은 모두 실패로 돌려준다 (화면은 규칙 기반 안내로 대신함)', async () => {
  await withFetch(async () => ({ ok: false, status: 429, json: async () => ({}) }), async () => {
    assert.deepEqual(await Chatbot.askAI([{ role: 'user', content: 'x' }], cfg), { ok: false, reason: 'http_429' });
  });
  await withFetch(async () => { throw new TypeError('Failed to fetch'); }, async () => {
    assert.deepEqual(await Chatbot.askAI([{ role: 'user', content: 'x' }], cfg), { ok: false, reason: 'network' });
  });
  await withFetch(async () => ({ ok: true, status: 200, json: async () => ({ text: '  ' }) }), async () => {
    assert.deepEqual(await Chatbot.askAI([{ role: 'user', content: 'x' }], cfg), { ok: false, reason: 'empty' });
  });
});

test('welcome: AI 사용 가능 여부에 따라 개인정보 안내가 사실대로 달라진다', () => {
  assert.ok(Chatbot.welcome(undefined, false).includes('입력한 글은 저장되거나 전송되지 않아요.'));
  const on = Chatbot.welcome(undefined, true);
  assert.ok(on.includes('켜기 전까지는 입력한 글이 저장되거나 전송되지 않아요'));
  assert.ok(!on.endsWith('입력한 글은 저장되거나 전송되지 않아요.'));
  assert.ok(Chatbot.consentText().includes('외부 AI 서비스'));
  assert.ok(Chatbot.consentText().includes('개인정보는 적지 마세요'));
});

test('safety(): 위기 안내는 고정 문구와 연락처 3곳이다', () => {
  const env = { CENTER: { phone: '032-325-3002', phoneHref: 'tel:032-325-3002', helpline: '1388', helplineHref: 'tel:1388', kakaoName: 'x', kakaoUrl: 'y', onlineApplyUrl: 'z' }, LOCATIONS: [] };
  const s = Chatbot.safety(env);
  assert.equal(s.text, SAFETY_TEXT);
  assert.deepEqual(s.actions.map(a => a.href), ['tel:1388', 'tel:109', 'tel:032-325-3002']);
});
