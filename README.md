# 마음카드 - 부천시청소년상담복지센터

타로와 간단한 마음 검사(연애 스타일·외로움·스트레스·마음날씨·자존감·무기력·번아웃)를 가볍게 해보고,
**검사 후 궁금한 점은 챗봇 '마음이'와 이야기하다가 온라인 상담 신청으로 이어지는** 정적 웹사이트입니다.
(마음서랍과는 별개 서비스입니다. 신청 폼·지역연결·마음기록·운영 자동화는 이 사이트에 없습니다.)

## 이용 흐름
검사/타로 → 결과 → 결과 화면 맨 아래 **"마음이에게 물어보기"** → 챗봇 대화 →
**"온라인 상담 신청하기"**(센터 홈페이지의 신청 화면으로 바로 이동) · 카카오톡 문의 · 전화 · 청소년전화 1388

## 구성
- `index.html` — 홈. 슬로건, 오늘 날짜, 카드 갤러리(타로 + 검사 7종), 마음이 입구
- `tests/*.html` — 검사 7종 (`loneliness` 외로움 · `stress` 스트레스 · `mood` 마음날씨 · `love` 연애 스타일 · `esteem` 자존감 · `burnout` 무기력 · `jobburnout` 번아웃)
- `tarot/` — 고민타파 타로 (78장, 카드 3장 뽑기)
- `chat.html` + `js/chatbot.js` + `css/chat.css` — 마음이 챗봇 (아래 참고)
- `supabase/functions/mindi-chat/` — AI 답변 서버 함수(`index.ts`)와 순수 로직(`logic.mjs`, 테스트 대상)
- `privacy.html`, `terms.html`, `css/legal.css` — 개인정보처리방침·이용약관(초안)
- `stats.html` — 관리자 통계 (Supabase 관리자 로그인 필요)
- `js/hub-core.js` — 유입경로(src) 추적, 이용 기록, 센터 연결 정보(`CENTER`), 가까운 센터 데이터(`LOCATIONS`), 결과 화면 안내(`renderCTA`), 하단 센터 로고
- `js/test-engine.js` — 검사 공통 엔진 (점수/게이지형, 유형형 모두 지원, 이전 문항 돌아가기, 결과 이미지·링크 공유)
- `css/hub.css` — 전체 디자인
- `supabase_setup.sql` — 이용 기록 테이블(`hub_events`) 생성 SQL

## 마음이 챗봇
기본은 **규칙 기반 자동 안내 도우미**입니다(입력한 글은 저장·전송되지 않음). 이용자가 직접 **'AI 답변'을 켜고 동의한 경우에만** 마음 이야기에 AI가 답합니다(아래 "AI 답변 연결").
- 상담 신청 방법 → **온라인 상담 신청** 버튼(센터 홈페이지 신청 화면, `CENTER.onlineApplyUrl`) · 카카오톡 문의 · 전화 · 1388
- **가까운 센터**: 사는 곳(구·동네)을 물어보고, 원미·소사·오정 중 가까운 센터와 지도 링크를 안내 (`LOCATIONS`)
- 운영 시간 등 모르는 정보는 모른다고 말하고 전화로 안내
- **위기·위험 표현**(자해·자살·폭력·학대·따돌림 등)은 다른 모든 안내보다 먼저 감지해서, 센터가 정한 **고정 문구**(`SAFETY_TEXT`)와 연락처 3곳(1388·109·센터)만 보여줍니다. AI를 켜도 이 문구는 AI가 쓰지 않습니다. 이 문구는 센터 확인 없이 바꾸지 마세요.
- 검사 결과 화면에서 `chat.html?from=<검사이름>`으로 넘어오면 어떤 검사였는지 인사에 덧붙입니다.
- 서버에는 질문 **종류**(예: `apply`, `area`, `lonely:ai`)만 익명으로 기록하고, 입력한 글은 기록하지 않습니다.

## AI 답변 연결 (Supabase Edge Function)
구조: 브라우저 → `supabase/functions/mindi-chat`(서버 함수) → Anthropic API. API 키는 서버 함수의 비밀값으로만 두고 코드에는 넣지 않습니다.
- **AI가 답하는 말**: 마음 이야기(외로움·우울·친구·학교·가족 등)와 규칙으로 이해하지 못한 말. **센터 정보(신청·전화·위치·비용)와 위기 표현은 항상 규칙 기반**으로 답합니다.
- **동의 후에만 켜짐**: 채팅 화면의 "AI 답변 켜기"에서 외부 전송 안내를 확인하고 동의해야 하며, 화면을 닫으면 다시 꺼집니다. 동의 전에 입력한 글은 AI로 보내지 않습니다.
- **서버 함수의 방어**: 위기 표현 재검사(AI 호출 안 함), 요청 길이 제한, IP별 호출 제한, 허용 주소(CORS) 확인, AI 답변에 지어낸 전화번호·인터넷 주소가 섞이면 폐기, 대화 내용 미저장(로그에는 상태 코드만).
- 실패(키 없음·한도 초과·네트워크 오류)하면 화면은 자동으로 규칙 기반 안내로 답합니다.

**배포 순서** (한 번만)
1. Supabase CLI 설치 후 로그인, 프로젝트 연결: `supabase link --project-ref <프로젝트ref>`
2. 비밀값 등록: `supabase secrets set ANTHROPIC_API_KEY=<Anthropic API 키> ALLOWED_ORIGINS=https://know7846-art.github.io`
   (모델을 바꾸려면 `ANTHROPIC_MODEL=<모델 ID>` 추가, 기본값은 `claude-haiku-4-5-20251001`)
3. 함수 배포: `supabase functions deploy mindi-chat`
4. Anthropic 콘솔에서 **월 사용 한도**를 설정합니다(공개 사이트라 한도가 없으면 비용이 계속 늘 수 있어요).
5. `js/hub-core.js`의 `CHAT_AI.enabled`를 `true`로 바꾸고 `hub-core.js` 캐시 버전을 올려 배포합니다.
6. 채팅 화면에서 AI 답변을 켜고, 마음 이야기·상담 신청·위기 표현을 각각 입력해 확인합니다.

## 개인정보처리방침 · 이용약관
`privacy.html`, `terms.html` — 모든 페이지 하단 링크에서 열립니다. 실제 코드가 하는 일(이용 기록 항목, 브라우저 저장값, AI 답변 사용 시 외부 전송 등)을 기준으로 쓴 **초안**이며, 노란색 표시(보유 기간·개인정보 보호책임자·시행일·Supabase 보관 지역)는 센터 확정 후 채우고 법률·개인정보 담당 검토를 거쳐야 합니다. 확정 후 문서 위쪽의 "초안" 안내 문구(`legal-draft`)를 지우세요. 수집 항목이나 외부 서비스가 바뀌면 이 문서도 함께 고쳐야 합니다.

## 공유 파일 수정 시 주의 (캐시 버전)
모든 페이지가 `hub-core.js?v=18`, `test-engine.js?v=8`, `chatbot.js?v=3`처럼 버전을 박아 캐시를 관리합니다. 해당 파일을 고치면 전체 HTML에서 숫자를 올려야 방문자 브라우저가 새 코드를 받습니다.
```
grep -rl 'hub-core.js?v=18' --include='*.html' . | xargs sed -i 's/hub-core.js?v=18/hub-core.js?v=18/g'
```

## 새 검사 추가하는 법
- **점수/게이지형**: `tests/mood.html`을 복사해 `questions`(옵션에 `score`)와 `bands`만 바꿉니다.
- **유형형**: `tests/love.html`을 복사해 `mode:'type'`, 옵션의 `type`, `types`만 바꿉니다.
- 홈 카드는 `index.html`의 `.cover-card` 블록을 복사하고 `css/hub.css`에 `cv-테마` 클래스를 추가합니다.

## 배포 전 준비
1. Supabase SQL Editor에서 `supabase_setup.sql` 실행 → `hub_events` 테이블 생성 (이용 기록용, 익명 쓰기만 허용)
2. 관리자 통계를 쓰려면 Supabase Authentication에서 관리자 계정을 만들고 `app_metadata.role = 'admin'`을 부여 (SQL Editor에서만 가능)
   `update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb where email = '...';`
3. 저장소 전체를 정적 호스팅(GitHub Pages 등)에 올립니다. 빌드 과정은 없습니다. `.nojekyll` 파일을 유지하세요.
4. 현재 코드는 `js/hub-core.js`의 `SUPABASE_URL` / `SUPABASE_KEY`(공개용 anon 키)를 사용합니다.

## 유입경로 링크
링크에 `?src=값`을 붙이면 이후 이동해도 같은 값으로 기록되어 `stats.html`에서 경로별로 볼 수 있습니다.
```
https://<배포주소>/?src=wee_school1
https://<배포주소>/?src=poster_qr
```

## 테스트
`npm test` (Node 내장 테스트 러너, `test/*.test.js`) — 챗봇 답변 선택(위기 표현 우선 처리 포함), AI 서버 함수 로직(위기 표현 목록이 챗봇과 같은지, 요청 검증, 답변 걸러내기), 공통 유틸.
GitHub Actions(`.github/workflows/ci.yml`)가 `main`/`master` 푸시마다 테스트와 로컬 파일 참조 검증을 실행합니다.

## 주의사항
- 모든 검사는 표준화된 임상 진단 도구가 아닌 자체 제작 간이 자가 점검용이며, 각 화면에 이 점을 명시했습니다.
- 검사·타로·챗봇은 이름·전화번호 등 개인정보를 수집하지 않고, 유입경로·이벤트 통계만 기록합니다.
- 센터 연결 정보(전화 032-325-3002, 카카오톡 '마인드클릭', 청소년전화 1388, 온라인 상담 신청 주소)는 `js/hub-core.js`의 `CENTER`에서 관리합니다.
