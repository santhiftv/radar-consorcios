-- =========================================================================
-- Radar Consórcios — Modelo de tokens para reivindicação de leads
-- =========================================================================
-- Ideia: parte do valor da assinatura vira "pool de tráfego pago" que gera
-- os leads. Cada consultor recebe uma cota SEMANAL de tokens proporcional
-- ao plano. Para reivindicar um lead, gasta 1 token. Quando acaba, pode
-- comprar pacotes avulsos (taxa adicional). Tokens semanais não acumulam
-- (reset toda segunda-feira 00:00 America/Sao_Paulo). Tokens avulsos têm
-- validade própria (30 dias).

begin;

-- ------------------------------------------------------------------------
-- 1) Campos novos em plans
-- ------------------------------------------------------------------------
alter table public.plans
  add column if not exists weekly_tokens int not null default 0,
  add column if not exists pool_contribution_cents int not null default 0;

comment on column public.plans.weekly_tokens is
  'Tokens que o plano concede toda segunda-feira. 1 token = 1 reivindicação de lead. Não acumula.';
comment on column public.plans.pool_contribution_cents is
  'Parte da mensalidade (em centavos) destinada ao pool de tráfego pago que gera os leads do plano.';

-- Valores iniciais por plano (ajustar conforme CPL real evoluir)
update public.plans set weekly_tokens = 1,  pool_contribution_cents = 4000  where code = 'essencial';
update public.plans set weekly_tokens = 3,  pool_contribution_cents = 10000 where code = 'profissional';
update public.plans set weekly_tokens = 6,  pool_contribution_cents = 20000 where code = 'premium';

-- ------------------------------------------------------------------------
-- 2) Saldo de tokens por consultor
-- ------------------------------------------------------------------------
create table if not exists public.consultant_tokens (
  consultant_id   uuid primary key references auth.users(id) on delete cascade,
  weekly_balance  int not null default 0 check (weekly_balance >= 0),
  extra_balance   int not null default 0 check (extra_balance  >= 0),
  week_start_at   timestamptz not null default date_trunc('week', timezone('America/Sao_Paulo', now())),
  weekly_quota    int not null default 0,
  updated_at      timestamptz not null default now()
);
alter table public.consultant_tokens enable row level security;

drop policy if exists "consultant_tokens_self_read" on public.consultant_tokens;
create policy "consultant_tokens_self_read" on public.consultant_tokens
  for select using (consultant_id = auth.uid());

-- ------------------------------------------------------------------------
-- 3) Histórico de tokens (ledger — append-only)
-- ------------------------------------------------------------------------
create table if not exists public.token_ledger (
  id                bigserial primary key,
  consultant_id     uuid not null references auth.users(id) on delete cascade,
  type              text not null check (type in
    ('grant_weekly','grant_purchase','grant_refund','consume_claim','expire_weekly','adjust')),
  amount            int not null,            -- positivo = ganho, negativo = gasto
  weekly_after      int not null,
  extra_after       int not null,
  lead_id           uuid references public.leads(id),
  assignment_id     uuid references public.lead_assignments(id),
  purchase_id       uuid,
  note              text,
  created_at        timestamptz not null default now()
);
create index if not exists token_ledger_consultant_idx
  on public.token_ledger (consultant_id, created_at desc);

alter table public.token_ledger enable row level security;
drop policy if exists "token_ledger_self_read" on public.token_ledger;
create policy "token_ledger_self_read" on public.token_ledger
  for select using (consultant_id = auth.uid());

-- ------------------------------------------------------------------------
-- 4) Pacotes avulsos de tokens
-- ------------------------------------------------------------------------
create table if not exists public.token_packages (
  id              uuid primary key default gen_random_uuid(),
  code            text unique not null,
  name            text not null,
  tokens          int not null check (tokens > 0),
  price_cents     int not null check (price_cents > 0),
  validity_days   int not null default 30 check (validity_days > 0),
  active          boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);
alter table public.token_packages enable row level security;
drop policy if exists "token_packages_public_read" on public.token_packages;
create policy "token_packages_public_read" on public.token_packages
  for select using (active);

insert into public.token_packages (code, name, tokens, price_cents, sort_order)
values
  ('pack-3',  '3 reivindicações extras',  3,  4900, 1),
  ('pack-7',  '7 reivindicações extras',  7,  9900, 2),
  ('pack-15', '15 reivindicações extras', 15, 19900, 3)
on conflict (code) do update
  set name = excluded.name,
      tokens = excluded.tokens,
      price_cents = excluded.price_cents,
      sort_order = excluded.sort_order;

-- ------------------------------------------------------------------------
-- 5) Compras de pacotes (Mercado Pago pagamento único)
-- ------------------------------------------------------------------------
create table if not exists public.token_purchases (
  id                 uuid primary key default gen_random_uuid(),
  consultant_id      uuid not null references auth.users(id) on delete cascade,
  package_id         uuid not null references public.token_packages(id),
  tokens             int not null,
  price_cents        int not null,
  status             text not null default 'pending' check (status in ('pending','paid','failed','canceled')),
  provider           text not null default 'mercado_pago',
  provider_preference_id text,
  provider_payment_id    text,
  checkout_url       text,
  expires_at         timestamptz,
  created_at         timestamptz not null default now(),
  paid_at            timestamptz
);
create index if not exists token_purchases_consultant_idx
  on public.token_purchases (consultant_id, created_at desc);
create index if not exists token_purchases_provider_payment_idx
  on public.token_purchases (provider_payment_id);

alter table public.token_purchases enable row level security;
drop policy if exists "token_purchases_self_read" on public.token_purchases;
create policy "token_purchases_self_read" on public.token_purchases
  for select using (consultant_id = auth.uid());

-- ------------------------------------------------------------------------
-- 6) Helpers internos
-- ------------------------------------------------------------------------
create or replace function private.week_start_now()
returns timestamptz
language sql stable as $$
  select date_trunc('week', timezone('America/Sao_Paulo', now()))
$$;

-- Garante saldo atualizado para o consultor (cria linha se não existir,
-- faz reset semanal se a última semana passou).
create or replace function private.ensure_token_balance(p_consultant uuid)
returns public.consultant_tokens
language plpgsql security definer set search_path = ''
as $$
declare
  v_row     public.consultant_tokens;
  v_plan    public.plans;
  v_sub     public.subscriptions;
  v_week_now timestamptz := private.week_start_now();
begin
  select * into v_row from public.consultant_tokens where consultant_id = p_consultant for update;
  select * into v_sub from private.current_subscription(p_consultant);
  if v_sub.plan_id is not null then
    select * into v_plan from public.plans where id = v_sub.plan_id;
  end if;

  if v_row.consultant_id is null then
    insert into public.consultant_tokens (consultant_id, weekly_balance, extra_balance, week_start_at, weekly_quota)
    values (p_consultant, coalesce(v_plan.weekly_tokens, 0), 0, v_week_now, coalesce(v_plan.weekly_tokens, 0))
    returning * into v_row;
    if v_plan.weekly_tokens > 0 then
      insert into public.token_ledger(consultant_id, type, amount, weekly_after, extra_after, note)
      values (p_consultant, 'grant_weekly', v_plan.weekly_tokens, v_row.weekly_balance, v_row.extra_balance, 'Início');
    end if;
    return v_row;
  end if;

  -- reset semanal
  if v_row.week_start_at < v_week_now then
    if v_row.weekly_balance > 0 then
      insert into public.token_ledger(consultant_id, type, amount, weekly_after, extra_after, note)
      values (p_consultant, 'expire_weekly', -v_row.weekly_balance, 0, v_row.extra_balance, 'Reset semanal');
    end if;
    v_row.weekly_balance := coalesce(v_plan.weekly_tokens, 0);
    v_row.weekly_quota   := coalesce(v_plan.weekly_tokens, 0);
    v_row.week_start_at  := v_week_now;
    v_row.updated_at     := now();
    update public.consultant_tokens
       set weekly_balance = v_row.weekly_balance,
           weekly_quota   = v_row.weekly_quota,
           week_start_at  = v_row.week_start_at,
           updated_at     = v_row.updated_at
     where consultant_id = p_consultant;
    if v_plan.weekly_tokens > 0 then
      insert into public.token_ledger(consultant_id, type, amount, weekly_after, extra_after, note)
      values (p_consultant, 'grant_weekly', v_plan.weekly_tokens, v_row.weekly_balance, v_row.extra_balance, 'Reset semanal');
    end if;
  end if;

  -- tokens avulsos expirados
  with expired as (
    select coalesce(sum(tokens - 0), 0)::int as total
    from public.token_purchases
    where consultant_id = p_consultant and status = 'paid'
      and expires_at is not null and expires_at < now()
      and not exists (
        select 1 from public.token_ledger l
        where l.consultant_id = p_consultant and l.purchase_id = token_purchases.id and l.type = 'adjust'
      )
  )
  select total into v_row.extra_balance from expired;
  -- nota: a lógica acima é conservadora; a expiração real é limpa pelo cron.

  return v_row;
end;
$$;

-- Consome 1 token (weekly antes de extra). Retorna qual bucket foi usado,
-- ou null se não há tokens.
create or replace function private.consume_token(
  p_consultant uuid,
  p_lead_id uuid,
  p_assignment_id uuid
) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.consultant_tokens;
  v_used text;
begin
  v_row := private.ensure_token_balance(p_consultant);
  if v_row.weekly_balance > 0 then
    update public.consultant_tokens
       set weekly_balance = weekly_balance - 1, updated_at = now()
     where consultant_id = p_consultant
    returning weekly_balance, extra_balance into v_row.weekly_balance, v_row.extra_balance;
    v_used := 'weekly';
  elsif v_row.extra_balance > 0 then
    update public.consultant_tokens
       set extra_balance = extra_balance - 1, updated_at = now()
     where consultant_id = p_consultant
    returning weekly_balance, extra_balance into v_row.weekly_balance, v_row.extra_balance;
    v_used := 'extra';
  else
    return null;
  end if;
  insert into public.token_ledger(consultant_id, type, amount, weekly_after, extra_after, lead_id, assignment_id, note)
  values (p_consultant, 'consume_claim', -1, v_row.weekly_balance, v_row.extra_balance, p_lead_id, p_assignment_id, v_used);
  return v_used;
end;
$$;

-- Devolve 1 token (usado quando lead é contestado e aceito). Repõe no bucket
-- "extra" para não distorcer a cota semanal.
create or replace function private.refund_token(
  p_consultant uuid,
  p_lead_id uuid,
  p_assignment_id uuid,
  p_note text default 'Reembolso de contestação'
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.consultant_tokens;
begin
  v_row := private.ensure_token_balance(p_consultant);
  update public.consultant_tokens
     set extra_balance = extra_balance + 1, updated_at = now()
   where consultant_id = p_consultant
  returning weekly_balance, extra_balance into v_row.weekly_balance, v_row.extra_balance;
  insert into public.token_ledger(consultant_id, type, amount, weekly_after, extra_after, lead_id, assignment_id, note)
  values (p_consultant, 'grant_refund', 1, v_row.weekly_balance, v_row.extra_balance, p_lead_id, p_assignment_id, p_note);
end;
$$;

-- ------------------------------------------------------------------------
-- 7) Reescreve claim_lead para consumir token
-- ------------------------------------------------------------------------
create or replace function public.claim_lead(p_lead_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_sub public.subscriptions;
  v_plan public.plans;
  v_lead public.leads;
  v_reason text;
  v_assignment uuid;
  v_deadline timestamptz;
  v_used int;
  v_bucket text;
  v_bal public.consultant_tokens;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;

  if not private.hit_rate_limit('claim:' || v_uid::text, 60, private.setting_int('claim_rate_limit_per_minute', 20)) then
    insert into public.lead_claim_attempts (lead_id, consultant_id, result) values (p_lead_id, v_uid, 'rate_limited');
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;

  select s.* into v_sub
  from public.subscriptions s
  where s.id = (select cs.id from private.current_subscription(v_uid) cs)
  for update;

  if v_sub.id is null then
    insert into public.lead_claim_attempts (lead_id, consultant_id, result) values (p_lead_id, v_uid, 'subscription_inactive');
    return jsonb_build_object('ok', false, 'reason', 'subscription_inactive');
  end if;

  select l.* into v_lead from public.leads l where l.id = p_lead_id for update;
  if v_lead.id is null then
    insert into public.lead_claim_attempts (lead_id, consultant_id, result) values (null, v_uid, 'not_found');
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if v_lead.status <> 'open' or v_lead.available_until <= now() then
    insert into public.lead_claim_attempts (lead_id, consultant_id, result) values (p_lead_id, v_uid, 'already_taken');
    return jsonb_build_object('ok', false, 'reason', 'already_taken');
  end if;

  v_reason := private.eligibility_reason(v_uid, p_lead_id, true, true);
  if v_reason is not null then
    insert into public.lead_claim_attempts (lead_id, consultant_id, result)
    values (p_lead_id, v_uid, case when v_reason = 'not_found' then 'not_eligible' else v_reason end);
    if v_reason = 'not_eligible' and private.eligibility_reason_ex(v_uid, p_lead_id, false, false, false) is null then
      return jsonb_build_object('ok', false, 'reason', 'premium_only', 'urgency', v_lead.urgency);
    end if;
    return jsonb_build_object('ok', false, 'reason', v_reason);
  end if;

  -- CONSOME TOKEN antes de criar o assignment
  v_bal := private.ensure_token_balance(v_uid);
  if v_bal.weekly_balance + v_bal.extra_balance <= 0 then
    insert into public.lead_claim_attempts (lead_id, consultant_id, result)
    values (p_lead_id, v_uid, 'insufficient_tokens');
    return jsonb_build_object(
      'ok', false,
      'reason', 'insufficient_tokens',
      'weekly_balance', 0,
      'extra_balance', 0
    );
  end if;

  select * into v_plan from public.plans where id = v_sub.plan_id;
  v_deadline := now() + make_interval(hours => private.setting_int('contact_deadline_hours', 24));

  insert into public.lead_assignments (lead_id, consultant_id, subscription_id, plan_code, contact_deadline)
  values (p_lead_id, v_uid, v_sub.id, v_plan.code, v_deadline)
  returning id into v_assignment;

  v_bucket := private.consume_token(v_uid, p_lead_id, v_assignment);

  update public.leads
     set status = 'assigned', current_assignment_id = v_assignment
   where id = p_lead_id;

  v_used := private.claims_used(v_sub);

  insert into public.lead_claim_attempts (lead_id, consultant_id, result) values (p_lead_id, v_uid, 'won');
  insert into public.lead_events (lead_id, actor_id, actor_type, event_type, data)
  values (p_lead_id, v_uid, 'consultant', 'claimed', jsonb_build_object(
    'assignment_id', v_assignment, 'plan', v_plan.code, 'subscription_id', v_sub.id,
    'claims_used', v_used, 'claim_limit', v_sub.claim_limit, 'contact_deadline', v_deadline,
    'token_bucket', v_bucket
  ));

  update public.notification_deliveries d
     set status = 'skipped', last_error = 'lead_claimed'
    from public.notifications n
   where n.id = d.notification_id and n.lead_id = p_lead_id and n.recipient_id <> v_uid
     and d.status in ('pending', 'failed');

  perform private.broadcast('leads-feed', 'lead_taken', jsonb_build_object('lead_id', p_lead_id));

  v_bal := private.ensure_token_balance(v_uid);

  return jsonb_build_object(
    'ok', true, 'assignment_id', v_assignment, 'contact_deadline', v_deadline,
    'claims_used', v_used, 'unlimited', v_plan.claims_unlimited,
    'claim_limit', case when v_plan.claims_unlimited then null else v_sub.claim_limit end,
    'remaining', case when v_plan.claims_unlimited then to_jsonb('sem limite'::text) else to_jsonb(greatest(v_sub.claim_limit - v_used, 0)) end,
    'token_bucket', v_bucket,
    'weekly_balance', v_bal.weekly_balance,
    'extra_balance', v_bal.extra_balance
  );
end;
$$;

-- ------------------------------------------------------------------------
-- 8) RPCs para o painel
-- ------------------------------------------------------------------------
create or replace function public.token_balance()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.consultant_tokens;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  v_row := private.ensure_token_balance(v_uid);
  return jsonb_build_object(
    'weekly_balance', v_row.weekly_balance,
    'weekly_quota',   v_row.weekly_quota,
    'extra_balance',  v_row.extra_balance,
    'week_start_at',  v_row.week_start_at,
    'next_reset_at',  v_row.week_start_at + interval '7 days'
  );
end;
$$;

grant execute on function public.token_balance() to authenticated;

create or replace function public.list_token_packages()
returns setof public.token_packages
language sql stable security definer set search_path = ''
as $$
  select * from public.token_packages where active order by sort_order;
$$;
grant execute on function public.list_token_packages() to authenticated;

create or replace function public.list_token_ledger(p_limit int default 50)
returns setof public.token_ledger
language sql stable security definer set search_path = ''
as $$
  select * from public.token_ledger
  where consultant_id = auth.uid()
  order by created_at desc
  limit greatest(1, least(p_limit, 500));
$$;
grant execute on function public.list_token_ledger(int) to authenticated;

-- ------------------------------------------------------------------------
-- 9) Fluxo de compra de pacote
-- ------------------------------------------------------------------------
-- Cria registro pendente (chamado pela rota /api/checkout/tokens). Retorna
-- id + preço + nome para a rota criar a preference no Mercado Pago.
create or replace function public.start_token_purchase(p_package_code text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_pkg public.token_packages;
  v_purchase public.token_purchases;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  select * into v_pkg from public.token_packages where code = p_package_code and active;
  if v_pkg.id is null then raise exception 'PACKAGE_NOT_FOUND' using errcode = 'P0002'; end if;

  insert into public.token_purchases(consultant_id, package_id, tokens, price_cents)
  values (v_uid, v_pkg.id, v_pkg.tokens, v_pkg.price_cents)
  returning * into v_purchase;

  return jsonb_build_object(
    'purchase_id', v_purchase.id,
    'tokens', v_pkg.tokens,
    'price_cents', v_pkg.price_cents,
    'package_name', v_pkg.name
  );
end;
$$;
grant execute on function public.start_token_purchase(text) to authenticated;

-- Marca a preference na compra (chamada pela rota após criar no MP).
create or replace function public.set_token_purchase_preference(
  p_purchase_id uuid,
  p_preference_id text,
  p_checkout_url text
) returns void
language sql security definer set search_path = ''
as $$
  update public.token_purchases
     set provider_preference_id = p_preference_id,
         checkout_url = p_checkout_url
   where id = p_purchase_id and consultant_id = auth.uid();
$$;
grant execute on function public.set_token_purchase_preference(uuid, text, text) to authenticated;

-- Credita tokens (chamado pelo webhook com service_role). Idempotente.
create or replace function private.credit_token_purchase(
  p_purchase_id uuid,
  p_payment_id text
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_pur public.token_purchases;
  v_bal public.consultant_tokens;
begin
  select * into v_pur from public.token_purchases where id = p_purchase_id for update;
  if v_pur.id is null then return false; end if;
  if v_pur.status = 'paid' then return false; end if;

  update public.token_purchases
     set status = 'paid',
         paid_at = now(),
         provider_payment_id = p_payment_id,
         expires_at = now() + make_interval(days => 30)
   where id = p_purchase_id;

  v_bal := private.ensure_token_balance(v_pur.consultant_id);
  update public.consultant_tokens
     set extra_balance = extra_balance + v_pur.tokens, updated_at = now()
   where consultant_id = v_pur.consultant_id
  returning weekly_balance, extra_balance into v_bal.weekly_balance, v_bal.extra_balance;

  insert into public.token_ledger(consultant_id, type, amount, weekly_after, extra_after, purchase_id, note)
  values (v_pur.consultant_id, 'grant_purchase', v_pur.tokens, v_bal.weekly_balance, v_bal.extra_balance, v_pur.id,
          'Pacote ' || v_pur.tokens || ' tokens');
  return true;
end;
$$;

commit;
