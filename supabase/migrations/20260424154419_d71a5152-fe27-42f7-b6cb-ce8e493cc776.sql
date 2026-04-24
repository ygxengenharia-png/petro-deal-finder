create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  item_number text not null,
  opportunity_number text not null,
  supplier text not null default '',
  sale_value_ygx numeric not null default 0,
  cost_value numeric not null default 0,
  description text,
  notes text,
  factory text,
  part_number text
);

alter table public.opportunities enable row level security;

-- Conta única compartilhada YGX (login validado no front-end).
-- Qualquer cliente pode ler, inserir, atualizar e excluir oportunidades.
create policy "Public read opportunities"
  on public.opportunities for select
  using (true);

create policy "Public insert opportunities"
  on public.opportunities for insert
  with check (true);

create policy "Public update opportunities"
  on public.opportunities for update
  using (true) with check (true);

create policy "Public delete opportunities"
  on public.opportunities for delete
  using (true);

create index opportunities_created_at_idx on public.opportunities (created_at desc);
create index opportunities_opportunity_number_idx on public.opportunities (opportunity_number);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger opportunities_set_updated_at
  before update on public.opportunities
  for each row execute function public.set_updated_at();