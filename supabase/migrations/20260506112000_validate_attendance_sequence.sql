create or replace function validar_secuencia_asistencia()
returns trigger
language plpgsql
as $$
declare
  ultimo_sentido text;
begin
  select sentido
  into ultimo_sentido
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
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validar_secuencia_asistencia on asistencias;

create trigger trg_validar_secuencia_asistencia
before insert on asistencias
for each row
execute function validar_secuencia_asistencia();
