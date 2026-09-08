-- 마음체크 허브 - 유입/이벤트 로그 테이블
-- Supabase 프로젝트(SQL Editor)에서 한 번만 실행하세요.
-- (js/js/api.js 와 동일한 Supabase 프로젝트: https://ymzcrjdzjolbebdjdilr.supabase.co)

create table if not exists hub_events (
  id bigint generated always as identity primary key,
  event_type text not null,        -- 'visit' | 'card_click' | 'test_start' | 'test_complete' | 'cta_click'
  src text,                        -- 유입경로 (?src=wee1, ?src=youth1 등)
  test_id text,                    -- 'tarot' | 'loneliness' | 'stress' | 'mood' | null
  extra text,                      -- 점수/밴드/클릭 채널 등 부가정보
  page text,
  created_at timestamptz not null default now()
);

alter table hub_events enable row level security;

-- 개인정보(이름/전화번호 등)를 저장하지 않으므로, 익명 키로 기록/조회 모두 허용
create policy if not exists "hub_events anon insert" on hub_events
  for insert to anon with check (true);

create policy if not exists "hub_events anon select" on hub_events
  for select to anon using (true);

create index if not exists hub_events_created_at_idx on hub_events (created_at);
create index if not exists hub_events_src_idx on hub_events (src);
