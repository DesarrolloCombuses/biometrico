alter table asistencias
add column if not exists enviado_buk boolean default false,
add column if not exists buk_status integer,
add column if not exists buk_respuesta jsonb,
add column if not exists buk_error text,
add column if not exists buk_enviado_at timestamptz;

create index if not exists idx_asistencias_enviado_buk on asistencias(enviado_buk);
