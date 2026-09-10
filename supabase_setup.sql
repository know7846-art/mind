-- 마음카드 허브 - 유입/이벤트 로그 테이블
-- Supabase 프로젝트(SQL Editor)에서 한 번만 실행하세요.
-- (마음카드 전용 Supabase 프로젝트: https://riilcevawcjnwgiiablw.supabase.co)

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
-- (정책은 IF NOT EXISTS 문법이 없어서, 기존 정책이 있으면 지우고 다시 만듭니다)
drop policy if exists "hub_events anon insert" on hub_events;
create policy "hub_events anon insert" on hub_events
  for insert to anon with check (true);

drop policy if exists "hub_events anon select" on hub_events;
create policy "hub_events anon select" on hub_events
  for select to anon using (true);

create index if not exists hub_events_created_at_idx on hub_events (created_at);
create index if not exists hub_events_src_idx on hub_events (src);
