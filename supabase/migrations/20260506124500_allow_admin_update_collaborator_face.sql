create policy "Admins pueden actualizar rostro de colaboradores"
on colaboradores for update
to authenticated
using (
  exists (
    select 1
    from perfiles
    where user_id = auth.uid()
      and rol = 'admin'
      and activo = true
  )
)
with check (
  exists (
    select 1
    from perfiles
    where user_id = auth.uid()
      and rol = 'admin'
      and activo = true
  )
);
