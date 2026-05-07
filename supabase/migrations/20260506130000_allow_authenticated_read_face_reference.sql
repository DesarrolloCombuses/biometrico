drop policy if exists "Admins pueden consultar rostros de referencia" on storage.objects;

create policy "Usuarios autenticados pueden consultar rostros de referencia"
on storage.objects for select
to authenticated
using (bucket_id = 'rostros-referencia');
