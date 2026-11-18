# 마음카드 - 부천시청소년상담복지센터 유입 허브

타로 상담 / 연애 스타일 / 외로움·스트레스·마음날씨·자존감·무기력·번아웃 간이 자가검사로 흥미를 유도하고,
결과 화면 끝에서 자연스럽게 부천시청소년상담복지센터(전화·카카오톡·1388)로 연결되는
경량 웹 허브입니다. 각 검사는 "표지 카드(cover card)" 갤러리 형태의 프리미엄 UI로 제공되며,
콘텐츠 진입 전 **설명(심리검사 소개 + 알아두면 좋은 신호) → 체크리스트형 인트로 → 문항 → 결과(게이지/유형 카드) → 센터 연결 CTA** 흐름을 따릅니다.

## 구성
- `index.html` — 허브 홈 (테마별 커버카드 갤러리, 오늘 날짜 표시, "오늘 마음 기록하기/마이/가까운 거점 보기" 내비게이션, "오늘의 한마디" 공감 위젯). 기록 이력이 있으면 인사말 문구만 살짝 달라짐(화면·기능은 동일)
- **오늘의 한마디**: 매일 바뀌는 짧은 공감 멘트(위로/쉼/연결/셀프케어/공감 태그, 18개 로테이션, `js/hub-core.js`의 `QUOTES`). "마음카드"(검사 갤러리 브랜드)와는 별개 콘텐츠. 공감 버튼을 누르면 `hub_events`에 `quote_like` 이벤트로 기록되고, 그 실제 집계 수만 보여줌(숫자를 꾸며내지 않음) — 하루 1명당 1회만 공감 가능(localStorage로 중복 방지)
- `record.html` — 마음기록 페이지. 감정 4종(좋아요/그럭저럭/지쳐요/힘들어요) 중 하나 선택 + 한 줄 메모(선택)로 하루 1건 기록, 최근 7일 스트립 표시. 기록은 **이 기기 localStorage에만 저장**되고 Supabase로 전송되지 않음
- `my.html` — 마이 페이지. 전체 기록 리스트, 총 기록일·연속 기록일 통계, 최근 기록 중 힘든 기분이 많으면 지역연결로 부드럽게 넛지. 기록 데이터 기반으로 `none/light/candidate/sustained` 4단계 참여 상태를 내부적으로만 구분(사용자에게 등급·점수로 노출하지 않음) — `js/hub-core.js`의 `Hub.Records.classify()` 참고
- `location.html` — 지역연결 페이지. 청(소)년 외로움 마음돌봄 프로젝트 4개 거점(원미/소사/오정/학교밖청소년지원센터) 안내 + 지도 링크, 기존 연계 프로그램(고요의 실/또래상담/청소년안전망/고위기청소년 클리닉) 소개, 센터 연결 CTA, "마음연결 신청하기" 버튼. 거점 데이터는 `js/hub-core.js`의 `Hub.LOCATIONS`에서 관리
- `apply.html` — 마음연결 신청 폼. 신청 종류(마음연결 패스/코디네이터 지원/보호자 자조모임), 본인·보호자 대리 구분, 이름·출생연도·연락처, 만 14세 미만이면 보호자 이름·연락처 자동 요구, 희망 센터, 하고 싶은 말(선택), 개인정보 수집·이용 동의(필수)를 받아 `applications` 테이블에 저장. 제출은 `Hub.submitApplication()`
- `applications-admin.html` — 신청 관리자 페이지. **Supabase Auth 이메일/비밀번호 로그인이 있어야만** 신청 목록을 볼 수 있음(익명 키로는 조회 불가, `supabase_applications_setup.sql`의 RLS 정책 참고). 신청 건별로 신규/연락완료/처리완료 상태 변경 가능. role 제한은 없음(코디네이터/센터 담당자 등 로그인 가능한 모든 계정 사용 가능)
- `admin-automation.html`, `admin-automation-inbox.html` — **운영 자동화 관리자 페이지**. 아래 "운영 자동화 시스템" 참고
- `tarot/` — 기존 "고민타파 타로 상담프로그램" 이식본
- `tests/love.html` — 연애 스타일 유형테스트 (8문항, 4가지 유형 + 찰떡궁합 결과, MBTI 테스트 형식)
- `tests/loneliness.html`, `tests/stress.html`, `tests/mood.html`, `tests/esteem.html`, `tests/burnout.html`, `tests/jobburnout.html` — 10문항 간이 자가검사 (점수/게이지형 결과). 각각 외로움(LSIS·UCLA 개념 참고), 스트레스(PSS 개념 참고), 마음날씨(PHQ-9 개념 참고), 자존감(로젠버그 자존감 척도 개념 참고), 무기력(일반적 에너지 소진), 번아웃(MBI 소진 척도 개념 참고, 학업·알바·취준 맥락)을 다루며, 모두 원척도를 그대로 쓰지 않고 자체 제작한 문항입니다.
- 각 검사 인트로 화면에는 `TEST_CONFIG.about`(심리검사 소개)과 `TEST_CONFIG.signs`(알아두면 좋은 신호 목록)를 넣을 수 있고, 넣으면 "시작하기" 버튼 전에 자동으로 노출됩니다 (`js/test-engine.js`의 `renderIntro()` 참고).
- `stats.html` — 유입경로/콘텐츠별 통계 (관리자 이메일/비밀번호로 Supabase 로그인해야 볼 수 있음, 비밀번호는 코드에 두지 않음)
- `js/hub-core.js` — 유입경로(src) 추적 + Supabase 이벤트 로깅 + 센터 연결 CTA 공통 컴포넌트 + 지역 거점 데이터(`Hub.LOCATIONS`) + 마음기록 로컬 저장소 모듈(`Hub.Records`, `Hub.MOODS`) + 신청 제출/관리자 인증 모듈(`Hub.submitApplication`, `Hub.Admin`)
- `js/test-engine.js` — 검사 공통 엔진 (점수형 게이지 결과 / 유형(type) 카드 결과 둘 다 지원)
- `css/hub.css` — 커버카드 갤러리, 인트로 체크리스트, 결과 카드(게이지·유형), 신청 폼 등 디자인 시스템
- `supabase_setup.sql` — 통계용 `hub_events` 테이블 생성 SQL (최초 1회, Supabase SQL Editor에서 실행)
- `supabase_applications_setup.sql` — 신청 접수용 `applications` 테이블 + 보안 정책(RLS) 생성 SQL. **신청 폼을 쓰려면 이 SQL도 꼭 실행해야 함** (아래 "신청 폼 배포 전 준비" 참고)
- `supabase_automation_setup.sql` — 운영 자동화 시스템 테이블(`automation_settings`/`automation_tasks`/`activity_logs`) + `is_admin()` 함수 + RLS + 9개 영역 기본값 생성 SQL (완료됨)

## 운영 자동화 시스템

코드 관리·보안 업데이트·사용자 문의·모니터링·배포·데이터 분석·비용·정책·제품 방향, 9개 영역에 대해 "AI가 어디까지 일할지"를 관리자가 정하고, AI가 만든 작업을 승인/반려하는 체계입니다.

**권한 모델**
- Supabase Auth 로그인은 기존과 동일하게 쓰되, 계정의 `app_metadata.role`이 `admin`인 경우에만 이 두 페이지에 들어갈 수 있습니다 (`user_metadata`가 아니라 `app_metadata`를 쓰는 이유: 로그인한 본인이 클라이언트에서 바꿀 수 없어서 권한 상승에 안전합니다).
- role 부여는 SQL Editor에서만 가능합니다 (`update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb where email = '...';`). 대시보드 UI에는 없습니다.
- RLS가 서버에서 한 번 더 강제하므로(`is_admin()` 함수), 클라이언트 쪽 role 체크를 우회해도 데이터 자체를 못 읽습니다.

**화면**
- `admin-automation.html` — 9개 영역 카드. 켜기/끄기, AI 권한 단계(보고만/초안 작성/수정 PR 작성/자동 처리), 실행 주기, 알림 기준을 바꾸면 즉시 저장되고 `activity_logs`에 기록됩니다.
- `admin-automation-inbox.html` — `automation_tasks`의 대기 중인 작업을 영역별로 보여주고 승인/반려. **"➕ 새 작업 등록"**에서 점검 결과를 직접 올릴 수 있음(아래 "운영 방식" 참고). 최근 활동 기록(누가/언제/무엇을)도 같은 페이지에서 확인합니다.

**운영 방식 — 자동 스케줄러 대신 수동 운영**
애초 계획은 정해진 주기마다 자동으로 도는 AI 실행기(6단계)였는데, 이러려면 Anthropic API 키가 추가로 필요합니다 — Claude 구독과는 별개의 종량제 과금 상품이라(세션 안에서 대화하는 것과 "내 프로그램이 API로 Claude를 호출하는 것"은 다른 상품입니다), 지금 규모에선 득보다 비용·복잡도가 큽니다. 그래서 다음과 같이 운영합니다.
1. 필요할 때 Claude(세션)에게 "OO 영역 점검하고 작업 등록해줘"라고 요청
2. Claude가 점검한 뒤 `admin-automation-inbox.html`의 **새 작업 등록** 폼으로(또는 Supabase SQL로) `automation_tasks`에 `pending` 상태로 등록 — `Hub.Automation.createTask()`
3. 관리자가 승인/반려

9개 영역의 `run_interval`(실행 주기) 값은 지금은 스케줄러가 안 읽지만, **"이 영역은 얼마나 자주 사람이 점검해야 하는지"의 기준**으로는 여전히 유효합니다.

**완료**: GitHub Actions(테스트+빌드), master 브랜치 보호(PR 필수 + CI 통과 필수) — 아래 README 상단 및 `.github/workflows/ci.yml` 참고.

**보류 (필요해지면 그때 진행)**
- **Sentry 연결** — 계정과 DSN 필요
- **AI 작업 실행기(완전 자동화)** — Anthropic API 키 필요, 지금은 수동 운영으로 대체
- **알림(Slack/카카오톡 등)** — 각 채널 webhook/API 키 필요, 지금은 관리자가 직접 inbox 페이지를 확인

## ⚠️ 공유 파일(`hub-core.js`, `hub.css`) 수정 시 주의
모든 페이지가 `<script src="js/hub-core.js?v=11">`, `<link href="css/hub.css?v=13">`처럼 쿼리스트링으로 버전을 박아서 캐시를 관리합니다. **`hub-core.js`나 `hub.css`를 수정했다면, 전체 HTML 파일(`tarot/index.html` 포함)에서 해당 버전 숫자를 한 칸씩 올려야** 배포 후 방문자 브라우저가 새 코드를 받아갑니다. 아래처럼 한 번에 바꾸면 됩니다(숫자는 현재 버전+1로 바꿔서 실행).
```
grep -rl 'hub-core.js?v=11' --include='*.html' . | xargs sed -i 's/hub-core.js?v=11/hub-core.js?v=12/g'
grep -rl 'hub.css?v=13' --include='*.html' . | xargs sed -i 's/hub.css?v=13/hub.css?v=14/g'
```

## 새 검사 추가하는 법
- **점수/게이지형** (외로움·스트레스처럼 총점→구간 판정): `tests/mood.html`을 복사해서 `questions`(옵션에 `score`)와 `bands`만 바꾸면 됨. `about`(심리검사 소개)과 `signs`(알아두면 좋은 신호 목록)를 채워주면 인트로 화면에 "설명 → 체크리스트 → 시작하기" 순으로 자동 노출됨.
- **유형(type)형** (연애스타일처럼 성향 4가지 중 하나로 결과): `tests/love.html`을 복사해서 `mode:'type'`, 옵션의 `type`, `types` 객체만 바꾸면 됨.
- 홈 화면 카드는 `index.html`의 `.cover-card` 블록을 하나 복사하고 `cv-테마클래스`(css/hub.css에 새로 추가)만 지정하면 새 커버가 생성됨.

## 배포 전 준비
1. Supabase 프로젝트(SQL Editor)에서 `supabase_setup.sql` 실행 → `hub_events` 테이블 생성 (**이미 완료됨**)
   - 마음카드 전용 Supabase 프로젝트 `https://pkaczonddvmhwwyhmxmt.supabase.co` (대시보드 프로젝트명: `loneliness`)를 사용합니다.
2. `마음카드/` 폴더 전체를 정적 호스팅(GitHub Pages 등)에 배포
3. `stats.html`의 관리자 비밀번호를 원하는 값으로 변경 권장

## 신청 폼(`apply.html`) 배포 전 준비

신청 폼은 이름·연락처 같은 개인정보를 다루므로, `hub_events`와는 별도의 준비가 한 번 더 필요합니다.

1. Supabase SQL Editor에서 `supabase_applications_setup.sql` 실행 → `applications` 테이블 + 보안 정책 생성 (**완료됨**)
   - 정책상 **익명 키(anon)로는 제출(insert)만 가능**하고, 조회(select)는 로그인한 관리자만 가능합니다.
2. Supabase 대시보드 → Authentication → Users → "Add user"로 관리자 계정(이메일/비밀번호) 생성 (**완료됨** — 테스트 계정 `admin@mindcard.test` 생성, 실제 운영 전 비밀번호 변경 또는 담당자 계정으로 교체 권장)
   - "Auto Confirm User"를 체크해 이메일 인증 없이 바로 쓸 수 있게 하는 걸 권장
   - 담당 코디네이터/센터 담당자 수만큼 계정을 만들어도 됨
3. `applications-admin.html`에 그 이메일/비밀번호로 로그인하면 신청 목록 확인 및 상태 변경 가능
4. 실제 제출 → 관리자 페이지 조회 → 상태 변경(연락완료)까지 전부 실 데이터로 테스트 완료. 테스트용으로 넣었던 샘플 신청 2건은 삭제해뒀습니다.

## Wee클래스 / 청년공간 배포 링크 만들기
유입 경로별로 링크에 `?src=` 값만 다르게 붙여서 배포하면, `stats.html`에서 경로별 유입 수를 확인할 수 있어요.

```
https://<배포주소>/마음카드/?src=wee_school1
https://<배포주소>/마음카드/?src=wee_school2
https://<배포주소>/마음카드/?src=youth_space1
https://<배포주소>/마음카드/?src=poster_qr
```

- 한 번 `?src=`로 들어오면 이후 허브 안에서 타로/검사 페이지로 이동해도 계속 같은 src 값으로 기록됩니다.
- 학교/기관마다 고유한 src 값을 정해서 안내문·QR코드에 인쇄하면 됩니다.

## 통계 확인
`https://<배포주소>/마음카드/stats.html` 접속 → 비밀번호 입력 →
- 기간별 총 방문/검사완료/센터연결클릭 수
- 유입경로(src)별 방문·시작·완료·센터연결클릭
- 콘텐츠(타로/연애스타일/외로움/스트레스/마음날씨/자존감/무기력/번아웃)별 시작·완료·완료율·센터연결클릭

## 주의사항
- 모든 검사는 표준화된 임상 진단 도구가 아닌 자체 제작 간이 자가 점검용입니다. 각 결과 화면에 이 점을 명시했습니다.
- 검사·콘텐츠 이용 자체는 이름·전화번호 등 개인정보를 수집하지 않고, 유입경로/이벤트 통계만 기록합니다.
- 마음기록(`record.html`/`my.html`)의 감정·메모 데이터는 서버로 전송되지 않고 방문자의 브라우저(localStorage)에만 남습니다. 기기를 바꾸거나 브라우저 데이터를 지우면 사라집니다.
- **신청 폼(`apply.html`)만 예외적으로 이름·출생연도·연락처(미성년자는 보호자 정보 포함)를 수집**합니다. 제출 전 개인정보 수집·이용 동의를 반드시 받고, `applications` 테이블은 RLS로 익명 조회를 막아뒀습니다. 실제 운영 전환 시에는 보유기간·파기 절차·수탁 처리 여부 등을 개인정보처리방침에 명시하고 법률 검토를 받아야 합니다.
- 센터 연결 정보(전화 032-325-3002, 카카오톡 채널 '마인드클릭', 청소년전화 1388)는 `js/hub-core.js`의 `CENTER` 객체에서 관리합니다.
