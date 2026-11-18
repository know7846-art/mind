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
- `stats.html` — 관리자 통계 (Supabase 관리자 로그인 필요)
- `js/hub-core.js` — 유입경로(src) 추적, 이용 기록, 센터 연결 정보(`CENTER`), 가까운 센터 데이터(`LOCATIONS`), 결과 화면 안내(`renderCTA`), 하단 센터 로고
- `js/test-engine.js` — 검사 공통 엔진 (점수/게이지형, 유형형 모두 지원, 이전 문항 돌아가기, 결과 이미지·링크 공유)
- `css/hub.css` — 전체 디자인
- `supabase_setup.sql` — 이용 기록 테이블(`hub_events`) 생성 SQL

## 마음이 챗봇
**AI가 아니라 규칙 기반 자동 안내 도우미**입니다. 입력한 글은 저장·전송되지 않고, 키워드로 정해진 안내를 골라 보여줍니다.
- 상담 신청 방법 → **온라인 상담 신청** 버튼(센터 홈페이지 신청 화면, `CENTER.onlineApplyUrl`) · 카카오톡 문의 · 전화 · 1388
- **가까운 센터**: 사는 곳(구·동네)을 물어보고, 원미·소사·오정 중 가까운 센터와 지도 링크를 안내 (`LOCATIONS`)
- 운영 시간 등 모르는 정보는 모른다고 말하고 전화로 안내
- **위기·위험 표현**(자해·자살·폭력·학대·따돌림 등)은 다른 모든 안내보다 먼저 감지해서, 센터가 정한 **고정 문구**(`SAFETY_TEXT`)와 연락처 3곳(1388·109·센터)만 보여줍니다. 이 문구는 센터 확인 없이 바꾸지 마세요.
- 검사 결과 화면에서 `chat.html?from=<검사이름>`으로 넘어오면 어떤 검사였는지 인사에 덧붙입니다.
- 서버에는 질문 **종류**(예: `apply`, `area`)만 익명으로 기록하고, 입력한 글은 보내지 않습니다.

## 공유 파일 수정 시 주의 (캐시 버전)
모든 페이지가 `hub-core.js?v=16`, `test-engine.js?v=8`, `chatbot.js?v=2`처럼 버전을 박아 캐시를 관리합니다. 해당 파일을 고치면 전체 HTML에서 숫자를 올려야 방문자 브라우저가 새 코드를 받습니다.
```
grep -rl 'hub-core.js?v=16' --include='*.html' . | xargs sed -i 's/hub-core.js?v=16/hub-core.js?v=17/g'
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
`npm test` (Node 내장 테스트 러너, `test/*.test.js`) — 챗봇 답변 선택(위기 표현 우선 처리 포함), 공통 유틸(CTA 순서, 관리자 토큰 등).
GitHub Actions(`.github/workflows/ci.yml`)가 `main`/`master` 푸시마다 테스트와 로컬 파일 참조 검증을 실행합니다.

## 주의사항
- 모든 검사는 표준화된 임상 진단 도구가 아닌 자체 제작 간이 자가 점검용이며, 각 화면에 이 점을 명시했습니다.
- 검사·타로·챗봇은 이름·전화번호 등 개인정보를 수집하지 않고, 유입경로·이벤트 통계만 기록합니다.
- 센터 연결 정보(전화 032-325-3002, 카카오톡 '마인드클릭', 청소년전화 1388, 온라인 상담 신청 주소)는 `js/hub-core.js`의 `CENTER`에서 관리합니다.
