# 마음체크 - 부천시청소년상담복지센터 유입 허브

타로 상담 / 연애 스타일 / 외로움·스트레스·마음날씨 간이 자가검사로 흥미를 유도하고,
결과 화면 끝에서 자연스럽게 부천시청소년상담복지센터(전화·카카오톡·1388)로 연결되는
경량 웹 허브입니다. 각 검사는 "표지 카드(cover card)" 갤러리 형태의 프리미엄 UI로 제공되며,
콘텐츠 진입 전 체크리스트형 인트로 → 문항 → 결과(게이지/유형 카드) → 센터 연결 CTA 흐름을 따릅니다.

## 구성
- `index.html` — 허브 홈 (테마별 커버카드 갤러리, 오늘 날짜 표시)
- `tarot/` — 기존 "고민타파 타로 상담프로그램" 이식본
- `tests/love.html` — 연애 스타일 유형테스트 (8문항, 4가지 유형 + 찰떡궁합 결과, MBTI 테스트 형식)
- `tests/loneliness.html`, `tests/stress.html`, `tests/mood.html` — 6문항 간이 자가검사 (점수/게이지형 결과)
- `stats.html` — 유입경로/콘텐츠별 통계 (관리자 비밀번호: `Bcheon-MindCheck26!`, `stats.html`의 `tryLogin()` 함수에서 변경 가능)
- `js/hub-core.js` — 유입경로(src) 추적 + Supabase 이벤트 로깅 + 센터 연결 CTA 공통 컴포넌트
- `js/test-engine.js` — 검사 공통 엔진 (점수형 게이지 결과 / 유형(type) 카드 결과 둘 다 지원)
- `css/hub.css` — 커버카드 갤러리, 인트로 체크리스트, 결과 카드(게이지·유형) 등 디자인 시스템
- `supabase_setup.sql` — 통계용 `hub_events` 테이블 생성 SQL (최초 1회, Supabase SQL Editor에서 실행)

## 새 검사 추가하는 법
- **점수/게이지형** (외로움·스트레스처럼 총점→구간 판정): `tests/mood.html`을 복사해서 `questions`(옵션에 `score`)와 `bands`만 바꾸면 됨.
- **유형(type)형** (연애스타일처럼 성향 4가지 중 하나로 결과): `tests/love.html`을 복사해서 `mode:'type'`, 옵션의 `type`, `types` 객체만 바꾸면 됨.
- 홈 화면 카드는 `index.html`의 `.cover-card` 블록을 하나 복사하고 `cv-테마클래스`(css/hub.css에 새로 추가)만 지정하면 새 커버가 생성됨.

## 배포 전 준비
1. Supabase 프로젝트(SQL Editor)에서 `supabase_setup.sql` 실행 → `hub_events` 테이블 생성
   - 마음체크 전용 Supabase 프로젝트(`https://riilcevawcjnwgiiablw.supabase.co`)를 사용합니다.
2. `마음체크/` 폴더 전체를 정적 호스팅(GitHub Pages 등)에 배포
3. `stats.html`의 관리자 비밀번호를 원하는 값으로 변경 권장

## Wee클래스 / 청년공간 배포 링크 만들기
유입 경로별로 링크에 `?src=` 값만 다르게 붙여서 배포하면, `stats.html`에서 경로별 유입 수를 확인할 수 있어요.

```
https://<배포주소>/마음체크/?src=wee_school1
https://<배포주소>/마음체크/?src=wee_school2
https://<배포주소>/마음체크/?src=youth_space1
https://<배포주소>/마음체크/?src=poster_qr
```

- 한 번 `?src=`로 들어오면 이후 허브 안에서 타로/검사 페이지로 이동해도 계속 같은 src 값으로 기록됩니다.
- 학교/기관마다 고유한 src 값을 정해서 안내문·QR코드에 인쇄하면 됩니다.

## 통계 확인
`https://<배포주소>/마음체크/stats.html` 접속 → 비밀번호 입력 →
- 기간별 총 방문/검사완료/센터연결클릭 수
- 유입경로(src)별 방문·시작·완료·센터연결클릭
- 콘텐츠(타로/연애스타일/외로움/스트레스/마음날씨)별 시작·완료·완료율·센터연결클릭

## 주의사항
- 모든 검사는 표준화된 임상 진단 도구가 아닌 자체 제작 간이 자가 점검용입니다. 각 결과 화면에 이 점을 명시했습니다.
- 이름·전화번호 등 개인정보는 수집하지 않고, 유입경로/이벤트 통계만 기록합니다.
- 센터 연결 정보(전화 032-325-3002, 카카오톡 채널 '마인드클릭', 청소년전화 1388)는 `js/hub-core.js`의 `CENTER` 객체에서 관리합니다.
