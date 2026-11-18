/**
 * 마음카드 허브 - 공통 유틸 (유입경로 추적 + 센터 연결 정보)
 * 마음카드 전용 Supabase 프로젝트(loneliness, pkaczonddvmhwwyhmxmt)를 사용합니다.
 * 사전 준비: Supabase에 hub_events, applications 테이블 생성 필요
 * (supabase_setup.sql, supabase_applications_setup.sql 참고 — 이미 이 프로젝트에 실행 완료됨)
 */
const SUPABASE_URL = 'https://pkaczonddvmhwwyhmxmt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Xj5xorln5c_LmjVtE9LOGg_qacUQFjf';

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

// 주소 문자열로 카카오맵 검색 링크 생성
function mapSearchUrl(address) {
  return `https://map.kakao.com/?q=${encodeURIComponent(address)}`;
}

// ===== 오늘의 한마디 (매일 바뀌는 가벼운 공감 멘트) =====
// "마음카드"(검사 갤러리 브랜드)와는 별개 개념 — 기획구성안.md §3 용어 정리 참고
const QUOTES = [
  { id: 'q01', tag: '쉼', text: '오늘 아무것도 안 해도 괜찮아요. 쉬는 것도 하루의 몫이에요.' },
  { id: 'q02', tag: '위로', text: '혼자인 시간이 꼭 외로움은 아니에요. 가끔은 그냥 혼자이고 싶은 거예요.' },
  { id: 'q03', tag: '연결', text: '문자 하나 보내는 것도 용기예요. 오늘 누군가에게 먼저 연락해볼까요?' },
  { id: 'q04', tag: '공감', text: '잘하고 있어요. 그 말, 오늘 스스로에게도 한번 해주세요.' },
  { id: 'q05', tag: '셀프케어', text: '힘든 하루였다면, 오늘은 그냥 버틴 것만으로도 충분해요.' },
  { id: 'q06', tag: '위로', text: '마음이 급해도 괜찮아요. 천천히 가도 결국 도착해요.' },
  { id: 'q07', tag: '연결', text: '꼭 큰 일이 아니어도 돼요. "밥 먹었어?" 한마디로도 연결은 시작돼요.' },
  { id: 'q08', tag: '셀프케어', text: '오늘 물 한 잔, 잠깐의 햇빛. 작은 챙김이 쌓이면 꽤 큰 힘이 돼요.' },
  { id: 'q09', tag: '공감', text: '비교하고 싶은 마음이 드는 날도 있어요. 그런 날도 있는 거예요.' },
  { id: 'q10', tag: '위로', text: '눈물이 나는 날엔, 참지 말고 그냥 울어도 괜찮아요.' },
  { id: 'q11', tag: '쉼', text: '오늘 할 일을 다 못 끝내도, 내일의 나에게 맡겨도 돼요.' },
  { id: 'q12', tag: '연결', text: '누군가 먼저 다가와주길 기다렸다면, 오늘은 내가 먼저 손 내밀어볼까요?' },
  { id: 'q13', tag: '셀프케어', text: '좋아하는 노래 한 곡, 그 3분이 오늘의 쉼표가 될 수 있어요.' },
  { id: 'q14', tag: '공감', text: '애쓰고 있다는 거, 아무도 몰라줘도 저는 알아요.' },
  { id: 'q15', tag: '위로', text: '괜찮은 척하지 않아도 되는 공간이 어딘가엔 꼭 있어요.' },
  { id: 'q16', tag: '쉼', text: '바쁘게 사는 것도 좋지만, 가끔은 멍하니 있는 시간도 필요해요.' },
  { id: 'q17', tag: '연결', text: '혼자 끙끙대던 고민, 한 사람에게만 말해도 무게가 꽤 줄어들어요.' },
  { id: 'q18', tag: '공감', text: '오늘 하루도 당신답게 지나갔다면, 그걸로 충분해요.' }
];

function dayIndex(d) {
  const t = d || new Date();
  const start = new Date(t.getFullYear(), 0, 0);
  return Math.floor((t - start) / 86400000);
}

const Quote = {
  today() {
    return QUOTES[dayIndex() % QUOTES.length];
  },
  likeKey(id) { return `${id}:${todayStr()}`; },
  hasLikedToday(id) {
    try { return localStorage.getItem('mc_liked_' + this.likeKey(id)) === '1'; } catch (e) { return false; }
  },
  like(id) {
    if (this.hasLikedToday(id)) return;
    try { localStorage.setItem('mc_liked_' + this.likeKey(id), '1'); } catch (e) {}
    Hub.log('quote_like', null, this.likeKey(id));
  },
  // 날짜와 무관하게 전체 멘트 목록을 순회하고 싶을 때(예: 메인 히어로의 "다른 카드 보기") 사용
  all() { return QUOTES.slice(); },
  // 실제 클릭 수만 보여줌(꾸며낸 숫자 없음) — hub_events에 개인정보가 없어 익명 조회가 이미 허용되어 있음
  async likeCount(id) {
    const key = this.likeKey(id);
    const url = `${SUPABASE_URL}/rest/v1/hub_events?event_type=eq.quote_like&extra=eq.${encodeURIComponent(key)}&select=id`;
    try {
      const res = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
      if (!res.ok) return 0;
      const rows = await res.json();
      return rows.length;
    } catch (e) { return 0; }
  }
};

// ===== 마음기록 (오늘의 감정 체크) =====
// 개인 기록은 Supabase로 보내지 않고 이 기기의 localStorage에만 저장됩니다 (로그인 없음, 서버 미전송)
const MOODS = [
  { key: 'good',  emoji: '😊', label: '좋아요' },
  { key: 'okay',  emoji: '🙂', label: '그럭저럭' },
  { key: 'tired', emoji: '😮‍💨', label: '지쳐요' },
  { key: 'hard',  emoji: '😔', label: '힘들어요' }
];
const RECORDS_KEY = 'mc_records';

function todayStr(d) {
  const t = d || new Date();
  const y = t.getFullYear(), m = String(t.getMonth() + 1).padStart(2, '0'), day = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
// 오늘(로컬 자정 기준)로부터 며칠 전인지
function daysAgo(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today - d) / 86400000);
}
// ISO 연-주차 키 (같은 주에 기록했는지 판단용)
function isoWeekKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = (d.getDay() + 6) % 7; // 월=0
  d.setDate(d.getDate() - day + 3);
  const firstThursday = new Date(d.getFullYear(), 0, 4);
  const diff = (d - firstThursday) / 86400000;
  const week = 1 + Math.round(diff / 7);
  return `${d.getFullYear()}-W${week}`;
}

const Records = {
  getAll() {
    try {
      const list = JSON.parse(localStorage.getItem(RECORDS_KEY) || '[]');
      return list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)); // 최신순
    } catch (e) { return []; }
  },
  getByDate(dateStr) {
    return this.getAll().find(r => r.date === dateStr) || null;
  },
  getToday() { return this.getByDate(todayStr()); },
  // 같은 날짜가 있으면 덮어씀(하루 1건)
  save(mood, note) {
    const all = this.getAll().filter(r => r.date !== todayStr());
    all.unshift({ date: todayStr(), mood, note: (note || '').trim().slice(0, 140), ts: Date.now() });
    try { localStorage.setItem(RECORDS_KEY, JSON.stringify(all)); } catch (e) {}
    return all[0];
  },
  moodInfo(key) { return MOODS.find(m => m.key === key) || MOODS[1]; },
  // 단순참여/지속참여를 사용자에게 보여주지 않고 내부적으로만 구분하기 위한 상태값
  // none: 기록 없음 / light: 가볍게 몇 번 / candidate: 최근 2주 3회+ / sustained: 8주 가까이 꾸준히
  classify() {
    const all = this.getAll();
    if (!all.length) return 'none';
    const last14 = all.filter(r => daysAgo(r.date) <= 14).length;
    const last56 = all.filter(r => daysAgo(r.date) <= 56);
    const weeks = new Set(last56.map(r => isoWeekKey(r.date)));
    const oldestDaysAgo = Math.max(...all.map(r => daysAgo(r.date)));
    if (oldestDaysAgo >= 49 && weeks.size >= 6) return 'sustained';
    if (last14 >= 3) return 'candidate';
    return 'light';
  }
};

const Hub = {
  CENTER,
  LOCATIONS,
  mapSearchUrl,
  MOODS,
  Records,
  todayStr,
  daysAgo,
  Quote,

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

  // ===== 마음연결 신청 제출 (anon 키로 insert만 가능, 조회는 관리자 로그인 필요) =====
  async submitApplication(payload) {
    const body = JSON.stringify({ ...payload, src: this.getSrc() });
    const res = await fetch(`${SUPABASE_URL}/rest/v1/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body
    });
    if (!res.ok) throw new Error('신청 접수에 실패했어요 (' + res.status + ')');
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
    async fetchApplications() {
      const token = this.getToken();
      if (!token) throw new Error('로그인이 필요해요');
      const res = await fetch(`${SUPABASE_URL}/rest/v1/applications?order=created_at.desc&limit=500`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) { this.logout(); throw new Error('로그인이 만료됐어요. 다시 로그인해주세요.'); }
      if (!res.ok) throw new Error('신청 목록을 불러오지 못했어요 (' + res.status + ')');
      return await res.json();
    },
    async updateStatus(id, status) {
      const token = this.getToken();
      if (!token) throw new Error('로그인이 필요해요');
      const res = await fetch(`${SUPABASE_URL}/rest/v1/applications?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${token}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('상태 변경에 실패했어요 (' + res.status + ')');
    },
    getEmail() {
      const token = this.getToken();
      if (!token) return null;
      const payload = this.decodeToken(token);
      return (payload && payload.email) || null;
    }
  },

  // ===== 운영 자동화 (automation_settings / automation_tasks / activity_logs) =====
  // 전부 role=admin 로그인(Hub.Admin) 필요 — RLS가 서버에서 다시 한 번 강제함
  Automation: {
    _authHeaders() {
      const token = Hub.Admin.getToken();
      if (!token) throw new Error('로그인이 필요해요');
      return { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` };
    },
    async fetchSettings() {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/automation_settings?order=id.asc`, {
        headers: this._authHeaders()
      });
      if (!res.ok) throw new Error('자동화 설정을 불러오지 못했어요 (' + res.status + ')');
      return await res.json();
    },
    // patch 예: { enabled: false } 또는 { permission_level: 'draft' }
    async updateSetting(id, area, patch) {
      const headers = this._authHeaders();
      const res = await fetch(`${SUPABASE_URL}/rest/v1/automation_settings?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() })
      });
      if (!res.ok) throw new Error('설정 변경에 실패했어요 (' + res.status + ')');
      await this.logActivity('admin', Hub.Admin.getEmail(), '설정 변경', area, JSON.stringify(patch));
    },
    async fetchTasks(status) {
      const q = status ? `&status=eq.${encodeURIComponent(status)}` : '';
      const res = await fetch(`${SUPABASE_URL}/rest/v1/automation_tasks?order=created_at.desc&limit=200${q}`, {
        headers: this._authHeaders()
      });
      if (!res.ok) throw new Error('작업 목록을 불러오지 못했어요 (' + res.status + ')');
      return await res.json();
    },
    // 수동 운영 모드: 스케줄러 없이, 사람이 점검을 요청했을 때(세션 안에서 AI가 직접, 또는 관리자가 직접) 작업을 등록
    // actorType: 'ai'(세션에서 점검한 결과를 등록) | 'admin'(관리자가 직접 작성)
    async createTask({ area, title, content, relatedLink, actorType }) {
      const headers = this._authHeaders();
      const res = await fetch(`${SUPABASE_URL}/rest/v1/automation_tasks`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({
          area, title,
          content: content || null,
          related_link: relatedLink || null,
          status: 'pending'
        })
      });
      if (!res.ok) throw new Error('작업 등록에 실패했어요 (' + res.status + ')');
      const [task] = await res.json();
      await this.logActivity(actorType || 'admin', Hub.Admin.getEmail(), '작업 등록', area, title);
      return task;
    },
    // decision: 'approved' | 'rejected' | 'done'
    async decideTask(id, decision) {
      const headers = this._authHeaders();
      const res = await fetch(`${SUPABASE_URL}/rest/v1/automation_tasks?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ status: decision, decided_at: new Date().toISOString(), decided_by: Hub.Admin.getEmail() })
      });
      if (!res.ok) throw new Error('작업 처리에 실패했어요 (' + res.status + ')');
      await this.logActivity('admin', Hub.Admin.getEmail(), '작업 ' + decision, 'task#' + id, null);
    },
    async fetchLogs(limit) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/activity_logs?order=created_at.desc&limit=${limit || 100}`, {
        headers: this._authHeaders()
      });
      if (!res.ok) throw new Error('활동 기록을 불러오지 못했어요 (' + res.status + ')');
      return await res.json();
    },
    async logActivity(actorType, actor, action, target, detail) {
      try {
        const headers = this._authHeaders();
        await fetch(`${SUPABASE_URL}/rest/v1/activity_logs`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({ actor_type: actorType, actor, action, target, detail })
        });
      } catch (e) { /* 로그 실패가 본 작업을 막지 않음 */ }
    }
  },

  // 결과 화면 공통 CTA 블록 렌더링
  // urgent=true 면(고위험 구간) 조금 더 눈에 띄게, 기본은 담담하고 차분한 톤으로 표시
  // opts.leadText / opts.note 로 검사 결과 화면이 아닌 곳(지역연결 등)에서 문구를 바꿔 쓸 수 있음
  renderCTA(container, testId, urgent, opts) {
    opts = opts || {};
    const leadText = opts.leadText || (urgent
      ? '결과를 보니 마음이 많이 쓰였을 것 같아요. 이런 감정은 혼자 견디지 않아도 괜찮아요. 지금 바로 이야기하고 싶다면 전화로 연락해주세요.'
      : '이 결과는 참고용이에요. 상담이 필요하다면 카카오톡에 문의를 남겨주세요. 확인 후 답변드려요. 바로 통화를 원하면 전화도 가능해요.');
    const note = opts.note || `${CENTER.name} · 만 9~24세 무료 상담`;
    container.innerHTML = `
      <div class="cta-box ${urgent ? 'cta-box-urgent' : ''}">
        <p class="cta-lead">${leadText}</p>
        <div class="cta-buttons">
          <a class="cta-btn ${urgent ? 'cta-btn-primary' : ''}" href="${CENTER.kakaoUrl}" target="_blank" rel="noopener" data-cta="kakao">💬 카카오톡 '${CENTER.kakaoName}'에 문의 남기기</a>
          <a class="cta-btn" href="${CENTER.phoneHref}" data-cta="phone">📞 센터 전화 (${CENTER.phone})</a>
          <a class="cta-btn" href="${CENTER.helplineHref}" data-cta="helpline">☎️ 청소년전화 ${CENTER.helpline} (24시간)</a>
          ${opts.hideChatLink ? '' : `<a class="cta-btn" href="${HUB_BASE}chat.html" data-cta="chat">🤖 궁금한 점은 마음이(자동 안내)에게 물어보기</a>`}
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
    .center-footer-admin-link { display: inline-block; margin-top: 10px; color: #b9b2a6; font-size: 10.5px; text-decoration: none; opacity: .7; }
    .center-footer-admin-link:hover { opacity: 1; text-decoration: underline; }
  `;
  document.head.appendChild(style);
  const footer = document.createElement('footer');
  footer.className = 'center-footer';
  footer.innerHTML = `
    <img class="center-logo" src="${HUB_BASE}images/center-logo.jpg" alt="부천시청소년상담복지센터 · 부천시청소년지원센터 꿈드림">
    <a class="center-footer-admin-link" href="${HUB_BASE}admin-automation.html">관리자</a>
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
  module.exports = { Hub, dayIndex, isoWeekKey, todayStr, daysAgo };
}
