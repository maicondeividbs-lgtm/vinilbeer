-- =============================================================
-- Vinil Beer — banco de dados
-- Rode isto no SQL Editor do Supabase quando chegar a hora.
-- =============================================================

create extension if not exists "uuid-ossp";

create table public.programas (
  id           uuid primary key default uuid_generate_v4(),
  slug         text not null unique,
  titulo       text not null,
  dias         text,          -- texto exibido: "Seg a Sex"
  horario      text,          -- texto exibido: "18h"
  apresentador text,
  descricao    text,
  capa_url     text,
  ordem        int  not null default 0,
  ativo        boolean not null default true,
  -- Grade real, usada para calcular o selo "NO AR".
  -- grade_dias: 0=domingo ... 6=sabado. Ex.: {1,2,3,4,5}
  grade_dias   smallint[],
  grade_inicio time,
  grade_fim    time,
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


-- =============================================================
-- DADOS INICIAIS
-- Roda junto e já deixa o site com o conteúdo atual.
-- =============================================================
insert into public.programas
  (slug, titulo, dias, horario, apresentador, descricao, ordem, grade_dias, grade_inicio, grade_fim)
values
  ('trilhas-fracassadas', 'Trilhas Fracassadas', 'Seg a Sex', '12h', 'Rafael',
   'As músicas que quase deram certo. Uma hora de hits que pararam no meio do caminho, com o contexto de quem viveu a época.',
   1, '{1,2,3,4,5}', '12:00', '13:00'),
  ('vinil-beer-classicos', 'Vinil Beer Clássicos', 'Seg a Sex', '18h', 'Rafa & Convidados',
   'O bloco principal da casa. Clássicos dos anos 80, 90 e 2000 no fim da tarde, com convidado toda semana.',
   2, '{1,2,3,4,5}', '18:00', '20:00'),
  ('resenha-de-quinta', 'Resenha de Quinta', 'Qui', '20h', 'Rafa & Galera',
   'Papo aberto sobre música, cinema e o que mais aparecer. Sem roteiro e sem enrolação.',
   3, '{4}', '20:00', '22:00'),
  ('flashback-weekend', 'Flashback Weekend', 'Sáb', '15h', 'Só pedradas!',
   'Sábado à tarde é só pedrada. Bloco contínuo, sem intervalo, pra deixar tocando.',
   4, '{6}', '15:00', '18:00');

update public.configuracoes set
  sobre = 'A Vinil Beer nasceu da paixão por música boa, cerveja gelada e conversas que ficam. Aqui a trilha é certeira e o papo é reto.',
  redes = '{"youtube":"https://youtube.com/@vinilbeer"}'::jsonb
where id = 1;


-- =============================================================
-- ADMINISTRAÇÃO
-- Cria o perfil automaticamente quando alguém se cadastra.
-- Ninguém nasce admin: a promoção é manual, por SQL (ver abaixo).
-- =============================================================
create or replace function public.criar_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, nome, admin)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', new.email), false)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil();

-- Recados: o admin também precisa poder apagar.
drop policy if exists "admin apaga" on public.recados;
create policy "admin apaga" on public.recados for delete using (public.eh_admin());

-- =============================================================
-- COMO CRIAR O PRIMEIRO ADMINISTRADOR
--
-- 1. No Supabase: Authentication > Users > Add user
--    Preencha e-mail e senha, e MARQUE "Auto Confirm User".
--
-- 2. Volte ao SQL Editor e rode a linha abaixo, trocando o e-mail:
--
--    update public.perfis set admin = true
--    where id = (select id from auth.users where email = 'seu@email.com');
--
-- 3. Pronto. Entre em /admin no site com esse e-mail e senha.
-- =============================================================


-- =============================================================
-- ACESSO AO PAINEL
-- =============================================================

-- Toda conta criada ganha automaticamente um perfil (sem permissão
-- de admin). Sem isto, a função eh_admin() não encontraria a linha.
create or replace function public.criar_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, nome, admin)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', new.email), false)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil();

-- Perfis já existentes (criados antes deste gatilho) entram agora.
insert into public.perfis (id, nome, admin)
select id, email, false from auth.users
on conflict (id) do nothing;

-- -------------------------------------------------------------
-- PARA LIBERAR SEU ACESSO:
-- 1. Authentication > Users > Add user (com e-mail e senha)
-- 2. Rode a linha abaixo trocando pelo seu e-mail:
--
-- update public.perfis set admin = true
-- where id = (select id from auth.users where email = 'SEU@EMAIL.COM');
-- -------------------------------------------------------------

-- O painel precisa listar programas inativos e resenhas ainda não
-- publicadas — coisas que a política de leitura pública esconde.
create policy "admin ve tudo" on public.programas for select using (public.eh_admin());
create policy "admin ve tudo" on public.resenhas  for select using (public.eh_admin());
