/**
 * 마음체크 허브 - 공통 유틸 (유입경로 추적 + 센터 연결 정보)
 * 마음체크 전용 Supabase 프로젝트를 사용합니다.
 * 사전 준비: Supabase에 hub_events 테이블 생성 필요 (마음체크/supabase_setup.sql 참고)
 */
const SUPABASE_URL = 'https://riilcevawcjnwgiiablw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_g3oCy7izIFkgwu1m7hTNJw_upbiAzgv';

// ===== 부천시청소년상담복지센터 연결 정보 =====
const CENTER = {
  name: '부천시청소년상담복지센터',
  phone: '032-325-3002',
  phoneHref: 'tel:032-325-3002',
  helpline: '1388',
  helplineHref: 'tel:1388',
  kakaoUrl: 'https://pf.kakao.com/_smsxeK',
  kakaoName: '마인드클릭',
  siteUrl: 'https://www.bwyf.or.kr/mindclick/selectBbsNttList.do?bbsNo=94&key=2896'
};

const Hub = {
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

  // 결과 화면 공통 CTA 블록 렌더링
  // urgent=true 면(고위험 구간) 조금 더 눈에 띄게, 기본은 담담하고 차분한 톤으로 표시
  renderCTA(container, testId, urgent) {
    const leadText = urgent
      ? '결과를 보니 마음이 많이 쓰였을 것 같아요. 이런 감정은 혼자 견디지 않아도 괜찮아요.'
      : '이 결과는 참고용이에요. 더 이야기 나눠보고 싶어질 때, 아래 방법들이 있다는 것만 기억해주세요.';
    container.innerHTML = `
      <div class="cta-box ${urgent ? 'cta-box-urgent' : ''}">
        <p class="cta-lead">${leadText}</p>
        <div class="cta-buttons">
          <a class="cta-btn ${urgent ? 'cta-btn-primary' : ''}" href="${CENTER.kakaoUrl}" target="_blank" rel="noopener" data-cta="kakao">💬 카카오톡 '${CENTER.kakaoName}'로 문의</a>
          <a class="cta-btn" href="${CENTER.phoneHref}" data-cta="phone">📞 센터 전화 (${CENTER.phone})</a>
          <a class="cta-btn" href="${CENTER.helplineHref}" data-cta="helpline">☎️ 청소년전화 ${CENTER.helpline} (24시간)</a>
        </div>
        <p class="cta-note">${CENTER.name} · 만 9~24세 무료 상담 · 이 검사는 전문 진단이 아닌 간이 자가 점검입니다</p>
      </div>
    `;
    container.querySelectorAll('[data-cta]').forEach(btn => {
      btn.addEventListener('click', () => Hub.log('cta_click', testId, btn.getAttribute('data-cta')));
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Hub.captureSrc();
  Hub.wireLinks();
});
