insert into perfiles (user_id, nombre, rol, activo)
select id, coalesce(raw_user_meta_data->>'name', email), 'admin', true
from auth.users
where email = 'alexander9492@hotmail.com'
on conflict (user_id) do update set
  rol = 'admin',
  activo = true,
  updated_at = now();

create or replace function validar_secuencia_asistencia()
returns trigger
language plpgsql
as $$
declare
  ultimo_sentido text;
  ultima_hora time;
begin
  select sentido, hora
  into ultimo_sentido, ultima_hora
  from asistencias
  where colaborador_id = new.colaborador_id
    and fecha = new.fecha
  order by created_at desc
  limit 1;

  if ultimo_sentido is null then
    if new.sentido <> 'entrada' then
      raise exception 'La primera marca del dia debe ser entrada.';
    end if;
  elsif ultimo_sentido = new.sentido then
    raise exception 'No se permite registrar dos marcas consecutivas del mismo tipo.';
  elsif new.sentido = 'salida' and new.hora <= ultima_hora then
    raise exception 'La hora de salida debe ser posterior a la entrada abierta.';
  end if;

  return new;
end;
$$;
