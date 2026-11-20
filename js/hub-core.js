/**
 * 마음카드 - 공통 유틸 (유입경로 추적 + 이용 기록 + 센터 연결 안내)
 * Supabase는 이용 기록(hub_events)과 관리자 통계 로그인에만 씁니다. (supabase_setup.sql 참고)
 */
const SUPABASE_URL = 'https://ofdkzdfkxlpgetspizwf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iV43wgrt-30YgYdf5dELrA__8pp6h5b';

// ===== 부천시청소년상담복지센터 연결 정보 =====
const CENTER = {
  name: '부천시청소년상담복지센터',
  phone: '032-325-3002',
  phoneHref: 'tel:032-325-3002',
  helpline: '1388',
  helplineHref: 'tel:1388',
  kakaoUrl: 'https://pf.kakao.com/_smsxeK',
  kakaoName: '마인드클릭',
  siteUrl: 'https://www.bwyf.or.kr/mindclick/selectBbsNttList.do?bbsNo=94&key=2896',
  // 센터 홈페이지의 온라인 상담 신청 화면 (챗봇·결과 화면에서 바로 연결)
  onlineApplyUrl: 'https://www.bwyf.or.kr/mindclick/addCnsltReqstView.do?reqstType=PERSON&idKey=2957&pwKey=2958&loginKey=2927&joinKey=2956&siteId=mindclick&key=3119&isExistCntntsFile=true&isLogined=false'
};

// ===== 청(소)년 외로움 마음돌봄 프로젝트 거점 안내 (2027 사업계획 기준) =====
// 세부 운영 프로그램·상담 가능 시간은 추후 각 센터와 확정되는 대로 업데이트 필요
const LOCATIONS = [
  {
    name: '원미센터', badge: '청소년',
    address: '부천시 원미구 장말로 107 복사골문화센터 3층',
    desc: '마음연결 패스·또래상담 등 청소년 대상 프로그램을 운영하는 거점이에요.'
  },
  {
    name: '소사센터', badge: '청소년',
    address: '부천시 소사구 경인로 92번길 33 송내어울마당 5층',
    desc: '마음연결 패스·또래상담 등 청소년 대상 프로그램을 운영하는 거점이에요.'
  },
  {
    name: '오정센터', badge: '청소년',
    address: '부천시 오정구 소사로 780 원종청소년어울마당',
    desc: '마음연결 패스·또래상담 등 청소년 대상 프로그램을 운영하는 거점이에요.'
  },
  {
    name: '학교밖청소년지원센터', badge: '학교밖',
    address: '부천시 소사구 경인로 92번길 33 송내어울마당 5층',
    desc: '학교 밖 청소년과 가족을 위한 상담·자립 지원을 전담하는 곳이에요.'
  }
];

// 마음이 AI 답변 — Supabase Edge Function(mindi-chat)을 배포하고 비밀값(ANTHROPIC_API_KEY)을 설정한 뒤 enabled를 true로 바꾼다.
// false인 동안에는 규칙 기반 안내만 쓰고, 입력한 글은 어디로도 전송되지 않는다.
const CHAT_AI = {
  enabled: false,
  url: `${SUPABASE_URL}/functions/v1/mindi-chat`
};

// 주소 문자열로 카카오맵 검색 링크 생성
function mapSearchUrl(address) {
  return `https://map.kakao.com/?q=${encodeURIComponent(address)}`;
}

const Hub = {
  CENTER,
  CHAT_AI,
  LOCATIONS,
  mapSearchUrl,

  // ===== 유입경로(src) 관리 =====
  // 최초 방문 시 URL의 ?src= 값을 localStorage에 저장해서, 허브 안에서 이동해도 계속 유지되게 함
  captureSrc() {
    try {
      const params = new URLSearchParams(location.search);
      const src = params.get('src');
      if (src) {
        localStorage.setItem('mc_src', src.slice(0, 60));
      }
    } catch (e) { /* noop */ }
    return this.getSrc();
  },
  getSrc() {
    try { return localStorage.getItem('mc_src') || 'direct'; }
    catch (e) { return 'direct'; }
  },
  // 허브 내 다른 페이지로 이동하는 링크에 ?src= 를 자동으로 붙여줌
  withSrc(href) {
    const src = this.getSrc();
    const sep = href.includes('?') ? '&' : '?';
    return src && src !== 'direct' ? `${href}${sep}src=${encodeURIComponent(src)}` : href;
  },
  // 페이지 내 [data-hub-link] 요소들에 src 파라미터 자동 부착
  wireLinks() {
    document.querySelectorAll('[data-hub-link]').forEach(el => {
      const base = el.getAttribute('data-hub-link');
      el.setAttribute('href', this.withSrc(base));
    });
  },

  // ===== 이벤트 로깅 (Supabase, fire-and-forget) =====
  // event_type 예: 'visit' | 'test_start' | 'test_complete' | 'cta_click'
  log(eventType, testId, extra) {
    try {
      const body = JSON.stringify({
        event_type: eventType,
        src: this.getSrc(),
        test_id: testId || null,
        extra: extra ? String(extra).slice(0, 200) : null,
        page: location.pathname,
        created_at: new Date().toISOString()
      });
      fetch(`${SUPABASE_URL}/rest/v1/hub_events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body
      }).catch(() => {});
    } catch (e) { /* 로깅 실패는 서비스에 영향 주지 않음 */ }
  },

  async listEvents(sinceDays = 30) {
    const since = new Date(Date.now() - sinceDays * 86400000).toISOString();
    const url = `${SUPABASE_URL}/rest/v1/hub_events?created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=5000`;
    const res = await fetch(url, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    if (!res.ok) throw new Error('통계 조회 실패: ' + res.status);
    return await res.json();
  },

  // ===== 관리자 인증 (Supabase Auth) — 신청 내역 조회/상태 변경에 필요 =====
  // anon 키만으로는 applications 테이블을 조회할 수 없고, 실제 로그인(JWT)이 있어야만 조회 가능 (RLS 정책 참고)
  Admin: {
    TOKEN_KEY: 'mc_admin_token',
    // JWT는 서명 검증 없이 payload만 읽음 — 화면 표시/분기용이고, 실제 권한 검사는
    // 서버(Supabase RLS의 is_admin())가 매 요청마다 다시 하므로 클라이언트에서 값을 믿고 신뢰하지 않음
    decodeToken(token) {
      try {
        const payload = token.split('.')[1];
        const json = decodeURIComponent(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
          .split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''));
        return JSON.parse(json);
      } catch (e) { return null; }
    },
    getRole() {
      const token = this.getToken();
      if (!token) return null;
      const payload = this.decodeToken(token);
      return payload && payload.app_metadata && payload.app_metadata.role || null;
    },
    isAdmin() { return this.getRole() === 'admin'; },
    // role=admin이 아니면 로그인 자체를 막음(automation_settings 등 admin 전용 화면에서 사용)
    async login(email, password, opts) {
      opts = opts || {};
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        const raw = data.error_description || data.msg || '';
        const KNOWN = {
          'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않아요.',
          'Email not confirmed': '이메일 인증이 완료되지 않은 계정이에요. Supabase 대시보드에서 확인해주세요.'
        };
        throw new Error(KNOWN[raw] || raw || '로그인에 실패했어요');
      }
      sessionStorage.setItem(this.TOKEN_KEY, data.access_token);
      if (opts.requireAdmin && !this.isAdmin()) {
        this.logout();
        throw new Error('관리자 권한이 없는 계정이에요.');
      }
      return data.access_token;
    },
    getToken() {
      try { return sessionStorage.getItem(this.TOKEN_KEY); } catch (e) { return null; }
    },
    logout() {
      try { sessionStorage.removeItem(this.TOKEN_KEY); } catch (e) {}
    },
    getEmail() {
      const token = this.getToken();
      if (!token) return null;
      const payload = this.decodeToken(token);
      return (payload && payload.email) || null;
    }
  },

  // 결과 화면 공통 CTA 블록 렌더링
  // urgent=true 면(고위험 구간) 조금 더 눈에 띄게, 기본은 담담하고 차분한 톤으로 표시
  // opts.leadText / opts.note 로 검사 결과 화면이 아닌 곳에서 문구를 바꿔 쓸 수 있음
  renderCTA(container, testId, urgent, opts) {
    opts = opts || {};
    const leadText = opts.leadText || (urgent
      ? '결과를 보니 마음이 많이 쓰였을 것 같아요. 이런 감정은 혼자 견디지 않아도 괜찮아요. 지금 바로 이야기하고 싶다면 전화로 연락해주세요.'
      : '이 결과는 참고용이에요. 결과나 상담이 궁금하다면 마음이에게 먼저 물어보세요. 사람과 이야기하고 싶다면 카카오톡 문의(확인 후 답변)나 전화도 가능해요.');
    const note = opts.note || `${CENTER.name} · 만 9~24세 무료 상담`;
    const chatHref = `${HUB_BASE}chat.html${testId && testId !== 'chatbot' ? '?from=' + encodeURIComponent(testId) : ''}`;
    const chatBtn = opts.hideChatLink ? '' :
      `<a class="cta-btn ${urgent ? '' : 'cta-btn-primary'}" href="${chatHref}" data-cta="chat">🤖 궁금한 점이 있다면 마음이(자동 안내)에게 물어보기</a>`;
    const contactBtns = `
          <a class="cta-btn" href="${CENTER.onlineApplyUrl}" target="_blank" rel="noopener" data-cta="online_apply">📝 온라인 상담 신청하기</a>
          <a class="cta-btn ${urgent ? 'cta-btn-primary' : ''}" href="${CENTER.kakaoUrl}" target="_blank" rel="noopener" data-cta="kakao">💬 카카오톡 '${CENTER.kakaoName}'에 문의 남기기</a>
          <a class="cta-btn" href="${CENTER.phoneHref}" data-cta="phone">📞 센터 전화 (${CENTER.phone})</a>
          <a class="cta-btn" href="${CENTER.helplineHref}" data-cta="helpline">☎️ 청소년전화 ${CENTER.helpline} (24시간)</a>`;
    container.innerHTML = `
      <div class="cta-box ${urgent ? 'cta-box-urgent' : ''}">
        <p class="cta-lead">${leadText}</p>
        <div class="cta-buttons">${urgent ? contactBtns + chatBtn : chatBtn + contactBtns}
        </div>
        <p class="cta-note">${note}</p>
      </div>
    `;
    container.querySelectorAll('[data-cta]').forEach(btn => {
      btn.addEventListener('click', () => Hub.log('cta_click', testId, btn.getAttribute('data-cta')));
    });
  }
};

// 이 스크립트 위치 기준으로 사이트 루트 경로 계산 (tests/, tarot/ 등 하위 폴더에서도 로고를 찾기 위함)
const HUB_BASE = document.currentScript ? document.currentScript.src.replace(/js\/hub-core\.js.*$/, '') : '';

// 화면 하단 공통 푸터: 슬로건 + 센터 로고 (관리자 통계 페이지는 body[data-no-footer]로 제외)
Hub.renderFooter = function () {
  if (document.body.hasAttribute('data-no-footer') || document.querySelector('.center-footer')) return;
  const style = document.createElement('style');
  style.textContent = `
    .center-footer { max-width: 420px; margin: 28px auto 24px; text-align: center; box-sizing: border-box; width: calc(100% - 32px); }
    .center-logo { display: block; width: 100%; max-width: 420px; height: auto; margin: 0 auto; mix-blend-mode: multiply; }
    .center-footer-links { margin: 12px 0 0; font-size: 12px; color: #9CA8AC; }
    .center-footer-links a { color: inherit; text-decoration: none; }
    .center-footer-links a:hover { text-decoration: underline; }
  `;
  document.head.appendChild(style);
  const footer = document.createElement('footer');
  footer.className = 'center-footer';
  footer.innerHTML = `
    <img class="center-logo" src="${HUB_BASE}images/center-logo.jpg" alt="부천시청소년상담복지센터 · 부천시청소년지원센터 꿈드림">
    <p class="center-footer-links"><a href="${HUB_BASE}privacy.html">개인정보처리방침</a> · <a href="${HUB_BASE}terms.html">이용약관</a></p>
  `;
  document.body.appendChild(footer);
};

document.addEventListener('DOMContentLoaded', () => {
  Hub.captureSrc();
  Hub.wireLinks();
  Hub.renderFooter();
});

// 브라우저에서는 무시되고(module이 없음), Node 테스트 실행기에서만 Hub를 내보냄
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Hub };
}
