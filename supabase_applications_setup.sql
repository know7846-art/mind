-- 마음카드 허브 - 마음연결 신청 테이블
-- Supabase 프로젝트(SQL Editor)에서 한 번만 실행하세요.
-- (마음카드 전용 Supabase 프로젝트: https://pkaczonddvmhwwyhmxmt.supabase.co (프로젝트명: loneliness))
--
-- hub_events와 달리 이 테이블은 이름·연락처 등 개인정보를 담습니다.
-- 그래서 익명 키(anon)로는 "제출(insert)"만 가능하게 하고, "조회(select)"는
-- 실제로 로그인한 관리자 계정(authenticated)만 할 수 있도록 제한합니다.
--
-- ⚠️ 이 SQL 실행만으로는 관리자 계정이 생기지 않습니다. 아래 순서로 준비하세요.
--   1. 이 SQL을 Supabase SQL Editor에서 실행 (테이블 + 보안 정책 생성)
--   2. Supabase 대시보드 → Authentication → Users → "Add user"로 관리자 이메일/비밀번호 생성
--      (담당 코디네이터/센터 담당자 계정. 이메일 인증은 꺼도 됨 / "Auto Confirm User" 체크)
--   3. applications-admin.html 에서 그 이메일/비밀번호로 로그인하면 신청 목록 확인 가능

create table if not exists applications (
  id bigint generated always as identity primary key,
  category text not null,              -- 'pass' | 'coordinator' | 'guardian_group'
  applicant_type text not null,        -- 'self' | 'guardian' (본인 신청 / 보호자가 대신 신청)
  name text not null,
  birth_year int,
  phone text not null,
  is_minor boolean not null default false,
  guardian_name text,
  guardian_phone text,
  preferred_location text,             -- 희망 센터
  message text,                        -- 하고 싶은 말 / 관심 영역 (선택)
  consent boolean not null default false,
  src text,
  status text not null default 'new',  -- 'new' | 'contacted' | 'done'
  created_at timestamptz not null default now()
);

alter table applications enable row level security;

drop policy if exists "applications anon insert" on applications;
create policy "applications anon insert" on applications
  for insert to anon with check (true);

-- 조회는 로그인한 관리자만 (anon select 정책을 만들지 않는 것이 핵심)
drop policy if exists "applications authenticated select" on applications;
create policy "applications authenticated select" on applications
  for select to authenticated using (true);

-- 상태 변경(연락완료 표시 등)도 로그인한 관리자만
drop policy if exists "applications authenticated update" on applications;
create policy "applications authenticated update" on applications
  for update to authenticated using (true) with check (true);

create index if not exists applications_created_at_idx on applications (created_at);
create index if not exists applications_status_idx on applications (status);
