-- Feature: Admin-Nutzerverwaltung (Beta-Tester-Status & Gesprächslimits).
-- Siehe feature-admin-user-management-v1.md.

alter table profiles
  add column if not exists is_admin boolean not null default false,
  add column if not exists is_beta_tester boolean not null default false,
  add column if not exists session_limit integer default 3;  -- null = unbegrenzt

grant all on profiles to service_role;
