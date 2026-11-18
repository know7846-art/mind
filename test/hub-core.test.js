// 공통 유틸(hub-core.js) 핵심 로직 테스트 — 관리자 토큰 디코딩, 유입경로, 센터 연결 안내(CTA), 지도 링크
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

const { Hub } = require('../js/hub-core.js');

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

test('Hub.mapSearchUrl: 주소를 카카오맵 검색 링크로 인코딩한다', () => {
  const url = Hub.mapSearchUrl('부천시 원미구 장말로 107');
  assert.ok(url.startsWith('https://map.kakao.com/?q='));
  assert.ok(url.includes(encodeURIComponent('부천시 원미구 장말로 107')));
});

test('Hub.CENTER: 온라인 상담 신청은 센터 홈페이지의 신청 화면을 가리킨다', () => {
  assert.ok(Hub.CENTER.onlineApplyUrl.startsWith('https://www.bwyf.or.kr/mindclick/addCnsltReqstView.do?'));
  assert.equal(Hub.CENTER.helpline, '1388');
});

test('Hub.withSrc: 유입경로가 있을 때만 ?src=를 붙인다', () => {
  assert.equal(Hub.withSrc('tests/love.html'), 'tests/love.html');
  localStorage.setItem('mc_src', 'insta');
  assert.equal(Hub.withSrc('tests/love.html'), 'tests/love.html?src=insta');
  assert.equal(Hub.withSrc('a.html?x=1'), 'a.html?x=1&src=insta');
});

test('Hub.Admin.decodeToken: 서명 검증 없이 JWT payload를 디코딩한다', () => {
  const payload = { email: 'admin@mindcard.test', app_metadata: { role: 'admin' } };
  const b64url = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const fakeJwt = `header.${b64url}.signature`;
  const decoded = Hub.Admin.decodeToken(fakeJwt);
  assert.equal(decoded.email, 'admin@mindcard.test');
  assert.equal(decoded.app_metadata.role, 'admin');
  sessionStorage.setItem(Hub.Admin.TOKEN_KEY, fakeJwt);
  assert.equal(Hub.Admin.isAdmin(), true);
});

test('Hub.Admin.decodeToken: 잘못된 토큰이면 null을 반환한다 (예외를 던지지 않음)', () => {
  assert.equal(Hub.Admin.decodeToken('not-a-valid-jwt'), null);
  assert.equal(Hub.Admin.isAdmin(), false);
});

function renderCta(testId, urgent, opts) {
  const box = { innerHTML: '', querySelectorAll: () => [] };
  Hub.renderCTA(box, testId, urgent, opts);
  return box.innerHTML;
}

test('Hub.renderCTA: 검사 후에는 마음이(챗봇) 안내가 가장 먼저 나오고, 어떤 검사였는지 함께 넘긴다', () => {
  const html = renderCta('loneliness', false);
  assert.ok(html.includes('chat.html?from=loneliness'));
  assert.ok(html.indexOf('data-cta="chat"') < html.indexOf('data-cta="online_apply"'));
  assert.ok(html.includes(Hub.CENTER.onlineApplyUrl));
  assert.ok(html.includes('data-cta="phone"') && html.includes('data-cta="helpline"'));
});

test('Hub.renderCTA: 위기 구간(urgent)에서는 전화·상담 신청이 먼저, 챗봇은 맨 뒤', () => {
  const html = renderCta('stress', true);
  assert.ok(html.indexOf('data-cta="online_apply"') < html.indexOf('data-cta="chat"'));
  assert.ok(html.indexOf('data-cta="helpline"') < html.indexOf('data-cta="chat"'));
});

test('Hub.renderCTA: 챗봇 화면에서는 챗봇 링크를 숨긴다', () => {
  const html = renderCta('chatbot', false, { hideChatLink: true });
  assert.ok(!html.includes('data-cta="chat"'));
  assert.ok(html.includes('data-cta="online_apply"'));
});
