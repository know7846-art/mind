// 붙여넣기용 서버 함수 파일(paste-into-dashboard.ts)이 최신인지, 그리고 가짜 Supabase 환경에서 실제로 동작하는지 검사한다.
// 동작 검사는 Node의 TypeScript 지원(22.18 이상)이 있어야 하므로, 없는 환경(예: Node 20 CI)에서는 건너뛴다.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const DIR = path.join(__dirname, '..', 'supabase', 'functions', 'mindi-chat');

test('paste-into-dashboard.ts는 index.ts + logic.mjs를 합친 최신 파일이다', async () => {
  const { buildSingle } = await import(pathToFileURL(path.join(DIR, 'build-single.mjs')).href);
  const current = fs.readFileSync(path.join(DIR, 'paste-into-dashboard.ts'), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(current, buildSingle(DIR), '원본을 고쳤다면 node supabase/functions/mindi-chat/build-single.mjs 를 다시 실행하세요');
});

async function loadHandler(env) {
  const tmp = path.join(os.tmpdir(), `mindi_fn_${process.pid}_${Date.now()}.mts`);
  fs.copyFileSync(path.join(DIR, 'paste-into-dashboard.ts'), tmp);
  let handler;
  globalThis.Deno = { env: { get: (k) => env[k] }, serve: (h) => { handler = h; } };
  try { await import(pathToFileURL(tmp).href); } finally { fs.rmSync(tmp, { force: true }); }
  return handler;
}

const ORIGIN = 'https://know7846-art.github.io';
const mkReq = (body, { origin = ORIGIN, method = 'POST', ip = '9.9.9.9' } = {}) =>
  new Request('http://x/functions/v1/mindi-chat', { method, headers: { origin, 'content-type': 'application/json', 'x-forwarded-for': ip }, body: method === 'POST' ? JSON.stringify(body) : undefined });
const ask = (content) => ({ messages: [{ role: 'user', content }] });

test('서버 함수 동작 검사 (가짜 환경)', async (t) => {
  const savedFetch = global.fetch;
  const savedDeno = globalThis.Deno;
  let handler;
  try { handler = await loadHandler({ GEMINI_API_KEY: 'test-key' }); }
  catch (e) { t.skip('이 Node 버전은 TypeScript 파일을 불러올 수 없어요: ' + e.code); return; }
  const calls = [];
  const aiSays = (text, ok = true, status = 200) => { global.fetch = async (url, opts) => { calls.push({ url, opts, body: JSON.parse(opts.body) }); return { ok, status, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [{ text }] } }] }) }; }; };
  const quiet = console.error; console.error = () => {};
  try {
    aiSays('많이 힘들었겠어요. 아래 버튼으로 상담을 이어갈 수 있어요.');
    let r = await handler(mkReq(ask('친구랑 싸워서 힘들어요'), { ip: '1.1.1.1' }));
    assert.equal(r.status, 200);
    assert.equal((await r.json()).text.startsWith('많이 힘들었겠어요'), true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');
    assert.equal(calls[0].opts.headers['x-goog-api-key'], 'test-key');
    assert.deepEqual(calls[0].body.contents, [{ role: 'user', parts: [{ text: '친구랑 싸워서 힘들어요' }] }]);
    assert.ok(calls[0].body.systemInstruction.parts[0].text.includes('마음이'));

    r = await handler(mkReq(ask('살기 싫어요'), { ip: '1.1.1.2' }));
    const safe = await r.json();
    assert.equal(r.status, 200); assert.equal(safe.safety, true);
    assert.ok(safe.text.includes('긴급한 위험 상황: 109'));
    assert.equal(calls.length, 1, '위기 표현에는 AI를 부르지 않아야 해요');

    r = await handler(mkReq(ask('안녕'), { origin: 'https://evil.example', ip: '1.1.1.3' }));
    assert.equal(r.status, 403);
    assert.equal(calls.length, 1);
    r = await handler(mkReq({ nope: 1 }, { ip: '1.1.1.4' }));
    assert.equal(r.status, 400);
    r = await handler(mkReq(null, { method: 'OPTIONS', ip: '1.1.1.5' }));
    assert.equal(r.status, 204);
    assert.equal(r.headers.get('access-control-allow-origin'), ORIGIN);

    aiSays('센터 전화는 02-123-4567이에요.');
    r = await handler(mkReq(ask('전화번호 알려줘'), { ip: '1.1.1.6' }));
    assert.equal(r.status, 502);
    assert.equal((await r.json()).error, 'unsafe_reply');

    aiSays('', false, 529);
    r = await handler(mkReq(ask('외로워요'), { ip: '1.1.1.7' }));
    assert.equal(r.status, 502);
    assert.equal((await r.json()).error, 'ai_unavailable');

    // 첫 모델이 하루 한도(429)면 다음 모델로 넘어간다
    calls.length = 0;
    global.fetch = async (url, opts) => { calls.push({ url }); return url.includes('gemini-3.5-flash-lite:') ? { ok: false, status: 429, json: async () => ({}) } : { ok: true, status: 200, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '괜찮아요, 천천히 이야기해요.' }] } }] }) }; };
    r = await handler(mkReq(ask('요즘 우울해요'), { ip: '1.1.1.8' }));
    assert.equal(r.status, 200);
    assert.deepEqual(calls.map(c => c.url.split('/models/')[1]), ['gemini-3.5-flash-lite:generateContent', 'gemini-3.1-flash-lite:generateContent']);
    // 한도가 찬 모델은 잠시 건너뛴다
    calls.length = 0;
    r = await handler(mkReq(ask('잠이 안 와요'), { ip: '1.1.1.9' }));
    assert.equal(r.status, 200);
    assert.deepEqual(calls.map(c => c.url.split('/models/')[1]), ['gemini-3.1-flash-lite:generateContent']);
    // 모든 모델이 한도면 quota_exhausted
    global.fetch = async () => ({ ok: false, status: 429, json: async () => ({}) });
    r = await handler(mkReq(ask('힘들어요'), { ip: '1.1.1.10' }));
    assert.equal(r.status, 429);
    assert.equal((await r.json()).error, 'quota_exhausted');

    aiSays('안녕하세요');
    let last;
    for (let i = 0; i < 21; i++) last = await handler(mkReq(ask('안녕' + i), { ip: '2.2.2.2' }));
    assert.equal(last.status, 429, '같은 접속자의 21번째 호출은 제한되어야 해요');
  } finally {
    console.error = quiet;
    global.fetch = savedFetch;
    globalThis.Deno = savedDeno;
  }

  // API 키가 없으면 AI를 쓸 수 없다고 정직하게 알린다
  const noKey = await loadHandler({});
  const r2 = await noKey(mkReq(ask('안녕'), { ip: '3.3.3.3' }));
  assert.equal(r2.status, 503);
  globalThis.Deno = savedDeno;
});
