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

drop policy if exists "contatos_select_own" on public.contatos;
drop policy if exists "contatos_insert_own" on public.contatos;
drop policy if exists "contatos_update_own" on public.contatos;
drop policy if exists "contatos_delete_own" on public.contatos;

drop policy if exists "atividades_select_own" on public.atividades;
drop policy if exists "atividades_insert_own" on public.atividades;

drop policy if exists "followups_select_own" on public.followups;
drop policy if exists "followups_insert_own" on public.followups;
drop policy if exists "followups_update_own" on public.followups;
drop policy if exists "followups_delete_own" on public.followups;

create policy "contatos_select_all_authenticated"
on public.contatos
for select
to authenticated
using (true);

create policy "contatos_insert_all_authenticated"
on public.contatos
for insert
to authenticated
with check (true);

create policy "contatos_update_all_authenticated"
on public.contatos
for update
to authenticated
using (true)
with check (true);

create policy "contatos_delete_all_authenticated"
on public.contatos
for delete
to authenticated
using (true);

create policy "atividades_select_all_authenticated"
on public.atividades
for select
to authenticated
using (true);

create policy "atividades_insert_all_authenticated"
on public.atividades
for insert
to authenticated
with check (true);

create policy "followups_select_all_authenticated"
on public.followups
for select
to authenticated
using (true);

create policy "followups_insert_all_authenticated"
on public.followups
for insert
to authenticated
with check (true);

create policy "followups_update_all_authenticated"
on public.followups
for update
to authenticated
using (true)
with check (true);

create policy "followups_delete_all_authenticated"
on public.followups
for delete
to authenticated
using (true);

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
