-- 마음카드 허브 - 운영 자동화 관리자 시스템
-- Supabase SQL Editor에서 한 번만 실행하세요. (프로젝트: loneliness, pkaczonddvmhwwyhmxmt)
--
-- 이 SQL은 세 가지를 만듭니다.
--   1) automation_settings / automation_tasks / activity_logs 3개 테이블
--   2) is_admin() 함수 — JWT의 app_metadata.role === 'admin' 인지 확인 (RLS에서 사용)
--   3) 기존 테스트 관리자 계정(admin@mindcard.test)에 role=admin 부여
--
-- role은 user_metadata가 아니라 app_metadata에 저장합니다. user_metadata는 로그인한
-- 본인이 클라이언트에서 바꿀 수 있어 권한 상승에 취약하고, app_metadata는 service_role
-- (또는 이 SQL Editor처럼 DB에 직접 접근하는 경우)로만 바꿀 수 있어 안전합니다.

-- ===== 1) 테이블 =====

create table if not exists automation_settings (
  id bigint generated always as identity primary key,
  area text not null unique,
  enabled boolean not null default true,
  -- 'report_only'(보고만) | 'draft'(초안 작성) | 'pr'(수정 PR 작성) | 'auto'(자동 처리)
  permission_level text not null default 'report_only',
  -- 'hourly' | 'daily' | 'weekly'
  run_interval text not null default 'daily',
  -- 'immediate'(즉시 알림) | 'daily_digest'(하루 한 번 요약)
  notify_threshold text not null default 'daily_digest',
  updated_at timestamptz not null default now()
);

create table if not exists automation_tasks (
  id bigint generated always as identity primary key,
  area text not null,
  title text not null,
  content text,
  -- 'pending'(대기) | 'approved'(승인) | 'rejected'(반려) | 'done'(완료)
  status text not null default 'pending',
  related_link text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by text
);

create table if not exists activity_logs (
  id bigint generated always as identity primary key,
  actor_type text not null,   -- 'ai' | 'admin'
  actor text,                 -- 이메일 또는 'automation-runner'
  action text not null,
  target text,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists automation_tasks_status_idx on automation_tasks (status);
create index if not exists automation_tasks_area_idx on automation_tasks (area);
create index if not exists activity_logs_created_at_idx on activity_logs (created_at);

-- ===== 2) 관리자 판별 함수 (RLS에서 재사용) =====

create or replace function is_admin()
returns boolean
language sql stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- ===== 3) RLS: 세 테이블 모두 "role=admin으로 로그인한 사람만" 조회/수정 가능 =====
-- 익명 키로는 아예 접근 불가 (automation_tasks를 AI 실행기가 쓸 때는 service_role 키를 쓰므로
-- RLS를 우회함 — service_role 키는 서버/CI 환경에만 두고 절대 클라이언트 코드에 넣지 않습니다)

alter table automation_settings enable row level security;
alter table automation_tasks enable row level security;
alter table activity_logs enable row level security;

drop policy if exists "automation_settings admin all" on automation_settings;
create policy "automation_settings admin all" on automation_settings
  for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists "automation_tasks admin all" on automation_tasks;
create policy "automation_tasks admin all" on automation_tasks
  for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists "activity_logs admin all" on activity_logs;
create policy "activity_logs admin all" on activity_logs
  for all to authenticated using (is_admin()) with check (is_admin());

-- ===== 4) 9개 영역 기본값 (전부 "보고만" 단계로 시작) =====

insert into automation_settings (area, enabled, permission_level, run_interval, notify_threshold)
values
  ('코드 관리', true, 'report_only', 'daily', 'daily_digest'),
  ('보안 업데이트', true, 'report_only', 'daily', 'immediate'),
  ('사용자 문의', true, 'report_only', 'hourly', 'immediate'),
  ('모니터링', true, 'report_only', 'hourly', 'immediate'),
  ('배포', true, 'report_only', 'daily', 'daily_digest'),
  ('데이터 분석', true, 'report_only', 'weekly', 'daily_digest'),
  ('비용', true, 'report_only', 'weekly', 'daily_digest'),
  ('정책', true, 'report_only', 'weekly', 'daily_digest'),
  ('제품 방향', true, 'report_only', 'weekly', 'daily_digest')
on conflict (area) do nothing;

-- ===== 5) 기존 테스트 관리자 계정에 role=admin 부여 =====
-- 다른 관리자 계정을 더 만들었다면 이 UPDATE의 email 조건을 바꿔서 추가로 실행하세요.

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'admin@mindcard.test';
