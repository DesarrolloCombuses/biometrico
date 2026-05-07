create policy "Admins pueden eliminar rostros de referencia"
on storage.objects for delete
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
