create or replace function obtener_hora_servidor_colombia()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'timestamp', to_char(timezone('America/Bogota', now()), 'YYYY-MM-DD"T"HH24:MI:SS'),
    'fecha', to_char(timezone('America/Bogota', now()), 'YYYY-MM-DD'),
    'hora', to_char(timezone('America/Bogota', now()), 'HH24:MI:SS')
  );
$$;

grant execute on function obtener_hora_servidor_colombia() to authenticated;

create or replace function normalizar_hora_asistencia_web()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.origen, 'web') = 'web' then
    new.fecha := timezone('America/Bogota', now())::date;
    new.hora := timezone('America/Bogota', now())::time;
    new.jornada := timezone('America/Bogota', now())::date;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_00_normalizar_hora_asistencia_web on asistencias;

create trigger trg_00_normalizar_hora_asistencia_web
before insert on asistencias
for each row
execute function normalizar_hora_asistencia_web();
