create extension if not exists pgcrypto;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'asistencia-fotos',
  'asistencia-fotos',
  false,
  750000,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table obras (
  id uuid primary key default gen_random_uuid(),
  obra_id_externo bigint unique,
  nombre text not null,
  direccion text,
  comuna text,
  region text,
  pais text default 'Chile',
  activa boolean default true,
  created_at timestamptz default now()
);

create table colaboradores (
  id uuid primary key default gen_random_uuid(),
  dni text not null unique,
  nombre text,
  telefono text,
  email text,
  empresa text,
  contrato text,
  especialidad text,
  estado text default 'vinculado',
  obra_id uuid references obras(id),
  puede_usar_app boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table perfiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  nombre text,
  rol text not null default 'registrador' check (rol in ('admin', 'registrador', 'consulta')),
  activo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table asistencias (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references colaboradores(id),
  obra_id uuid references obras(id),
  fecha date not null default current_date,
  hora time not null default current_time,
  jornada date,
  sentido text not null check (sentido in ('entrada', 'salida')),
  foto_path text,
  foto_eliminar_en date default (current_date + 15),
  latitud numeric,
  longitud numeric,
  origen text default 'web',
  registrado_por uuid references auth.users(id),
  enviado_buk boolean default false,
  buk_status integer,
  buk_respuesta jsonb,
  buk_error text,
  buk_enviado_at timestamptz,
  observacion text,
  created_at timestamptz default now()
);

create table novedades_asistencia (
  id uuid primary key default gen_random_uuid(),
  asistencia_id uuid references asistencias(id) on delete cascade,
  tipo text not null,
  observacion text,
  created_at timestamptz default now()
);

create index idx_colaboradores_dni on colaboradores(dni);
create index idx_colaboradores_obra_id on colaboradores(obra_id);
create index idx_perfiles_user_id on perfiles(user_id);
create index idx_asistencias_colaborador_id on asistencias(colaborador_id);
create index idx_asistencias_fecha on asistencias(fecha);
create index idx_asistencias_registrado_por on asistencias(registrado_por);
create index idx_asistencias_foto_eliminar_en on asistencias(foto_eliminar_en);
create index idx_asistencias_enviado_buk on asistencias(enviado_buk);

alter table obras enable row level security;
alter table colaboradores enable row level security;
alter table perfiles enable row level security;
alter table asistencias enable row level security;
alter table novedades_asistencia enable row level security;

create policy "Usuarios autenticados pueden consultar obras"
on obras for select
to authenticated
using (true);

create policy "Usuarios autenticados pueden consultar colaboradores"
on colaboradores for select
to authenticated
using (true);

create policy "Usuarios autenticados pueden crear colaboradores"
on colaboradores for insert
to authenticated
with check (true);

create policy "Usuarios autenticados pueden consultar su perfil"
on perfiles for select
to authenticated
using (user_id = auth.uid());

create policy "Usuarios autenticados pueden consultar asistencias"
on asistencias for select
to authenticated
using (true);

create policy "Usuarios autenticados pueden registrar asistencias"
on asistencias for insert
to authenticated
with check (registrado_por = auth.uid());

create policy "Usuarios autenticados pueden consultar novedades"
on novedades_asistencia for select
to authenticated
using (true);

create policy "Usuarios autenticados pueden crear novedades"
on novedades_asistencia for insert
to authenticated
with check (true);

create policy "Usuarios autenticados pueden subir fotos de asistencia"
on storage.objects for insert
to authenticated
with check (bucket_id = 'asistencia-fotos');

create policy "Usuarios autenticados pueden consultar fotos de asistencia"
on storage.objects for select
to authenticated
using (bucket_id = 'asistencia-fotos');

create policy "Usuarios autenticados pueden actualizar fotos de asistencia"
on storage.objects for update
to authenticated
using (bucket_id = 'asistencia-fotos')
with check (bucket_id = 'asistencia-fotos');
