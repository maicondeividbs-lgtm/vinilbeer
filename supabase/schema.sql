-- =============================================================
-- Vinil Beer — banco de dados
-- Rode isto no SQL Editor do Supabase quando chegar a hora.
-- =============================================================

create extension if not exists "uuid-ossp";

create table public.programas (
  id           uuid primary key default uuid_generate_v4(),
  slug         text not null unique,
  titulo       text not null,
  dias         text,
  horario      text,
  apresentador text,
  descricao    text,
  capa_url     text,
  ordem        int  not null default 0,
  ativo        boolean not null default true,
  criado_em    timestamptz not null default now()
);

create table public.playlist (
  id        uuid primary key default uuid_generate_v4(),
  artista   text not null,
  titulo    text not null,
  capa_url  text,
  tocada_em timestamptz not null default now()
);
create index playlist_tocada_em_idx on public.playlist (tocada_em desc);

create table public.resenhas (
  id            uuid primary key default uuid_generate_v4(),
  slug          text not null unique,
  titulo        text not null,
  resumo        text,
  texto         text,
  capa_url      text,
  youtube_id    text,
  publicada_em  timestamptz,
  criado_em     timestamptz not null default now()
);
create index resenhas_publicada_idx on public.resenhas (publicada_em desc nulls last);

create type public.status_recado as enum ('pendente', 'aprovado', 'recusado');

create table public.recados (
  id        uuid primary key default uuid_generate_v4(),
  nome      text not null,
  texto     text not null,
  status    public.status_recado not null default 'pendente',
  criado_em timestamptz not null default now()
);

create table public.configuracoes (
  id              int primary key default 1 check (id = 1),
  stream_url      text,
  now_playing_url text,
  sobre           text,
  redes           jsonb not null default '{}'::jsonb,
  atualizado_em   timestamptz not null default now()
);
insert into public.configuracoes (id) values (1);

create table public.perfis (
  id        uuid primary key references auth.users(id) on delete cascade,
  nome      text,
  admin     boolean not null default false,
  criado_em timestamptz not null default now()
);

-- =============================================================
-- Segurança por linha (RLS)
-- Regra: o conteúdo é público para leitura; só o admin escreve.
-- =============================================================
alter table public.programas     enable row level security;
alter table public.playlist      enable row level security;
alter table public.resenhas      enable row level security;
alter table public.recados       enable row level security;
alter table public.configuracoes enable row level security;
alter table public.perfis        enable row level security;

create or replace function public.eh_admin()
returns boolean language sql security definer set search_path = public as $$
  select coalesce((select admin from public.perfis where id = auth.uid()), false);
$$;

create policy "leitura publica" on public.programas     for select using (ativo);
create policy "leitura publica" on public.playlist      for select using (true);
create policy "leitura publica" on public.configuracoes for select using (true);
create policy "leitura publica" on public.resenhas
  for select using (publicada_em is not null and publicada_em <= now());

create policy "admin escreve" on public.programas     for all using (public.eh_admin()) with check (public.eh_admin());
create policy "admin escreve" on public.playlist      for all using (public.eh_admin()) with check (public.eh_admin());
create policy "admin escreve" on public.resenhas      for all using (public.eh_admin()) with check (public.eh_admin());
create policy "admin escreve" on public.configuracoes for all using (public.eh_admin()) with check (public.eh_admin());

-- Recados: qualquer pessoa envia, mas só o admin lê e modera.
create policy "ouvinte envia" on public.recados for insert with check (true);
create policy "admin le"      on public.recados for select using (public.eh_admin());
create policy "admin modera"  on public.recados for update using (public.eh_admin());

create policy "le proprio perfil" on public.perfis for select using (auth.uid() = id or public.eh_admin());
