alter table obras enable row level security;
alter table colaboradores enable row level security;
alter table perfiles enable row level security;
alter table asistencias enable row level security;
alter table novedades_asistencia enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'obras'
      and policyname = 'Usuarios autenticados pueden consultar obras'
  ) then
    create policy "Usuarios autenticados pueden consultar obras"
    on obras for select
    to authenticated
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'colaboradores'
      and policyname = 'Usuarios autenticados pueden consultar colaboradores'
  ) then
    create policy "Usuarios autenticados pueden consultar colaboradores"
    on colaboradores for select
    to authenticated
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'perfiles'
      and policyname = 'Usuarios autenticados pueden consultar su perfil'
  ) then
    create policy "Usuarios autenticados pueden consultar su perfil"
    on perfiles for select
    to authenticated
    using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'asistencias'
      and policyname = 'Usuarios autenticados pueden consultar asistencias'
  ) then
    create policy "Usuarios autenticados pueden consultar asistencias"
    on asistencias for select
    to authenticated
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'asistencias'
      and policyname = 'Usuarios autenticados pueden registrar asistencias'
  ) then
    create policy "Usuarios autenticados pueden registrar asistencias"
    on asistencias for insert
    to authenticated
    with check (registrado_por = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'novedades_asistencia'
      and policyname = 'Usuarios autenticados pueden consultar novedades'
  ) then
    create policy "Usuarios autenticados pueden consultar novedades"
    on novedades_asistencia for select
    to authenticated
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'novedades_asistencia'
      and policyname = 'Usuarios autenticados pueden crear novedades'
  ) then
    create policy "Usuarios autenticados pueden crear novedades"
    on novedades_asistencia for insert
    to authenticated
    with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Usuarios autenticados pueden subir fotos de asistencia'
  ) then
    create policy "Usuarios autenticados pueden subir fotos de asistencia"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'asistencia-fotos');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Usuarios autenticados pueden consultar fotos de asistencia'
  ) then
    create policy "Usuarios autenticados pueden consultar fotos de asistencia"
    on storage.objects for select
    to authenticated
    using (bucket_id = 'asistencia-fotos');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Usuarios autenticados pueden actualizar fotos de asistencia'
  ) then
    create policy "Usuarios autenticados pueden actualizar fotos de asistencia"
    on storage.objects for update
    to authenticated
    using (bucket_id = 'asistencia-fotos')
    with check (bucket_id = 'asistencia-fotos');
  end if;
end $$;
