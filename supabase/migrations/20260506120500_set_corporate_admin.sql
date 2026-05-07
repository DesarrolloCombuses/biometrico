insert into perfiles (user_id, nombre, rol, activo)
select id, coalesce(raw_user_meta_data->>'name', email), 'admin', true
from auth.users
where email = 'administradorcontrol@combuses.com.co'
on conflict (user_id) do update set
  rol = 'admin',
  activo = true,
  updated_at = now();

update perfiles
set rol = 'registrador',
    updated_at = now()
where user_id in (
  select id
  from auth.users
  where email = 'alexander9492@hotmail.com'
)
and rol = 'admin';
