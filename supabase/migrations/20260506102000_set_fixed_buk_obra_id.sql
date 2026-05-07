insert into obras (obra_id_externo, nombre, pais, activa)
values (39305, 'Empresa principal', 'Chile', true)
on conflict (obra_id_externo) do update set
  activa = true;

update obras
set obra_id_externo = 39305
where obra_id_externo is null;
