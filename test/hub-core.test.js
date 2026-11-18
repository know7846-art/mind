// 핵심 로직(날짜 계산, 참여 상태 분류, 관리자 토큰 디코딩, 지도/오늘의 한마디)에 대한 기본 테스트.
// 브라우저 전용 전역(localStorage, document 등)은 최소한으로 흉내만 낸다 — 실제 DOM/네트워크는 쓰지 않음.
'use strict';
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

function makeStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

global.localStorage = makeStorage();
global.sessionStorage = makeStorage();
global.document = {
  currentScript: null,
  addEventListener() {},
  querySelectorAll: () => [],
  querySelector: () => null,
  createElement: () => ({ style: {}, appendChild() {} }),
  head: { appendChild() {} },
  body: { appendChild() {}, hasAttribute: () => true }
};
global.location = { pathname: '/', search: '', hostname: 'localhost' };
global.fetch = async () => { throw new Error('이 테스트에서는 네트워크를 쓰지 않습니다'); };

const { Hub, todayStr, daysAgo } = require('../js/hub-core.js');

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

test('todayStr: 날짜를 YYYY-MM-DD로 포맷한다', () => {
  assert.equal(todayStr(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(todayStr(new Date(2026, 9, 15)), '2026-10-15');
});

test('daysAgo: 오늘로부터 며칠 전인지 올바르게 계산한다', () => {
  const today = new Date();
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  assert.equal(daysAgo(todayStr(threeDaysAgo)), 3);
  assert.equal(daysAgo(todayStr(today)), 0);
});

test('Hub.mapSearchUrl: 주소를 카카오맵 검색 링크로 인코딩한다', () => {
  const url = Hub.mapSearchUrl('부천시 원미구 장말로 107');
  assert.ok(url.startsWith('https://map.kakao.com/?q='));
  assert.ok(url.includes(encodeURIComponent('부천시 원미구 장말로 107')));
});

test('Hub.Quote.today: 같은 날엔 같은 문구를 결정적으로 반환한다', () => {
  const q1 = Hub.Quote.today();
  const q2 = Hub.Quote.today();
  assert.equal(q1.id, q2.id);
  assert.ok(q1.text.length > 0);
  assert.ok(q1.tag.length > 0);
});

test('Hub.Records.save: 하루에 한 건만 저장하고 같은 날짜는 덮어쓴다', () => {
  Hub.Records.save('good', '첫 기록');
  Hub.Records.save('tired', '수정된 기록');
  const all = Hub.Records.getAll();
  assert.equal(all.length, 1);
  assert.equal(all[0].mood, 'tired');
  assert.equal(all[0].note, '수정된 기록');
});

test('Hub.Records.classify: 기록이 없으면 "none"', () => {
  assert.equal(Hub.Records.classify(), 'none');
});

test('Hub.Records.classify: 최근 14일 내 3회 이상이면 "candidate"', () => {
  const today = new Date();
  const records = [0, 1, 2].map((i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    return { date: todayStr(d), mood: 'good', note: '', ts: Date.now() };
  });
  localStorage.setItem('mc_records', JSON.stringify(records));
  assert.equal(Hub.Records.classify(), 'candidate');
});

test('Hub.Admin.decodeToken: 서명 검증 없이 JWT payload를 디코딩한다', () => {
  const payload = { email: 'admin@mindcard.test', app_metadata: { role: 'admin' } };
  const b64url = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const fakeJwt = `header.${b64url}.signature`;
  const decoded = Hub.Admin.decodeToken(fakeJwt);
  assert.equal(decoded.email, 'admin@mindcard.test');
  assert.equal(decoded.app_metadata.role, 'admin');
});

test('Hub.Admin.decodeToken: 잘못된 토큰이면 null을 반환한다 (예외를 던지지 않음)', () => {
  assert.equal(Hub.Admin.decodeToken('not-a-valid-jwt'), null);
});
