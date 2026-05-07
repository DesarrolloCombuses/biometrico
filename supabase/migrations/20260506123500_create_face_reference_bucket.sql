insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'rostros-referencia',
  'rostros-referencia',
  false,
  750000,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table colaboradores
add column if not exists foto_referencia_path text,
add column if not exists rostro_enrolado boolean default false,
add column if not exists rostro_enrolado_at timestamptz;

create policy "Admins pueden subir rostros de referencia"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'rostros-referencia'
  and exists (
    select 1
    from perfiles
    where user_id = auth.uid()
      and rol = 'admin'
      and activo = true
  )
);

create policy "Admins pueden consultar rostros de referencia"
on storage.objects for select
to authenticated
using (
  bucket_id = 'rostros-referencia'
  and exists (
    select 1
    from perfiles
    where user_id = auth.uid()
      and rol = 'admin'
      and activo = true
  )
);

create policy "Admins pueden actualizar rostros de referencia"
on storage.objects for update
to authenticated
using (
  bucket_id = 'rostros-referencia'
  and exists (
    select 1
    from perfiles
    where user_id = auth.uid()
      and rol = 'admin'
      and activo = true
  )
)
with check (
  bucket_id = 'rostros-referencia'
  and exists (
    select 1
    from perfiles
    where user_id = auth.uid()
      and rol = 'admin'
      and activo = true
  )
);
