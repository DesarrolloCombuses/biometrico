create policy "Usuarios autenticados pueden crear colaboradores"
on colaboradores for insert
to authenticated
with check (true);
