-- =========================================================
-- SIPANDA — 001 Extensions & Helpers
-- =========================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()

-- Generic "updated_at" auto-touch trigger, reused by most tables.
create or replace function sipanda_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Generic audit-log trigger. Requires the app to set, per request/transaction:
--   select set_config('app.current_user_id', '<uuid-of-user>', true);
--   select set_config('app.client_ip', '<ip>', true);          -- optional
-- If not set, logs with user_id = null (server-side/system actions).
create or replace function sipanda_audit_trigger()
returns trigger
language plpgsql
as $$
declare
  v_user uuid;
  v_ip text;
  v_action text;
  v_record_id text;
begin
  begin
    v_user := nullif(current_setting('app.current_user_id', true), '')::uuid;
  exception when others then
    v_user := null;
  end;
  v_ip := nullif(current_setting('app.client_ip', true), '');

  if tg_op = 'INSERT' then
    v_action := 'CREATE';
    v_record_id := new.id::text;
    insert into audit_logs (user_id, action, module, record_id, old_value, new_value, ip_address)
    values (v_user, v_action, tg_table_name, v_record_id, null, to_jsonb(new), v_ip);
    return new;
  elsif tg_op = 'UPDATE' then
    v_action := 'UPDATE';
    v_record_id := new.id::text;
    insert into audit_logs (user_id, action, module, record_id, old_value, new_value, ip_address)
    values (v_user, v_action, tg_table_name, v_record_id, to_jsonb(old), to_jsonb(new), v_ip);
    return new;
  elsif tg_op = 'DELETE' then
    v_action := 'DELETE';
    v_record_id := old.id::text;
    insert into audit_logs (user_id, action, module, record_id, old_value, new_value, ip_address)
    values (v_user, v_action, tg_table_name, v_record_id, to_jsonb(old), null, v_ip);
    return old;
  end if;
  return null;
end;
$$;
