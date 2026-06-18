# CRM 4Charge

CRM em React + Vite com autenticação e banco online no Supabase.

## Configuração

1. Instale as dependências:

```bash
npm install
```

2. Crie um projeto no Supabase.

3. Copie `.env.example` para `.env` e preencha:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

4. No Supabase, abra **SQL Editor** e execute o script abaixo.

## SQL do Supabase

```sql
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.contatos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  estabelecimento text not null,
  dono text,
  whatsapp text,
  segmento text,
  totem text,
  canal text,
  status text not null default 'Novo',
  followup date,
  observacoes text,
  valor numeric(12,2),
  data_fechamento date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.atividades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contato_id uuid references public.contatos(id) on delete cascade,
  tipo text not null,
  descricao text,
  created_at timestamptz not null default now()
);

create table if not exists public.followups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contato_id uuid not null references public.contatos(id) on delete cascade,
  data_followup date not null,
  observacao text,
  concluido boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contato_id, data_followup)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists contatos_set_updated_at on public.contatos;
create trigger contatos_set_updated_at
before update on public.contatos
for each row execute function public.set_updated_at();

drop trigger if exists followups_set_updated_at on public.followups;
create trigger followups_set_updated_at
before update on public.followups
for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.contatos enable row level security;
alter table public.atividades enable row level security;
alter table public.followups enable row level security;

create policy "users_select_own" on public.users
for select using (auth.uid() = id);

create policy "users_insert_own" on public.users
for insert with check (auth.uid() = id);

create policy "contatos_select_own" on public.contatos
for select using (auth.uid() = user_id);

create policy "contatos_insert_own" on public.contatos
for insert with check (auth.uid() = user_id);

create policy "contatos_update_own" on public.contatos
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "contatos_delete_own" on public.contatos
for delete using (auth.uid() = user_id);

create policy "atividades_select_own" on public.atividades
for select using (auth.uid() = user_id);

create policy "atividades_insert_own" on public.atividades
for insert with check (auth.uid() = user_id);

create policy "followups_select_own" on public.followups
for select using (auth.uid() = user_id);

create policy "followups_insert_own" on public.followups
for insert with check (auth.uid() = user_id);

create policy "followups_update_own" on public.followups
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "followups_delete_own" on public.followups
for delete using (auth.uid() = user_id);
```

## Autenticação

No Supabase, vá em **Authentication > Providers** e mantenha **Email** ativo.

Se quiser permitir login logo após cadastro, desative a confirmação obrigatória de e-mail em **Authentication > Sign In / Providers > Email**. Se a confirmação estiver ativa, o usuário precisa confirmar o e-mail antes de entrar.

## Rodar localmente

```bash
npm run dev
```

## O que fica online

- Login e cadastro por e-mail/senha com Supabase Auth.
- Contatos salvos em `contatos`, sempre vinculados ao `user_id`.
- Cada usuário vê apenas os próprios contatos via RLS.
- Follow-ups salvos na tabela `followups` quando uma data é informada no contato.
- Criação, atualização e exclusão registram eventos em `atividades`.
- Metas, faturamento e funil continuam calculados a partir dos contatos do usuário logado.
- O detalhe do contato tem botão de WhatsApp com mensagem pronta.
