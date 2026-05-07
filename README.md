# Asistencia Combuses

Aplicacion web para registro de asistencia con Supabase, captura de rostro, validacion por CSV y envio a Buk/Ctrlit mediante Edge Function.

## Archivos principales

- `asistencia-web.html`: entrada principal de la app.
- `asistencia.css`: estilos responsivos.
- `asistencia.js`: logica frontend.
- `supabase-config.js`: configuracion publica de Supabase y URL del CSV.
- `assets/logo-combuses.webp`: logo.
- `supabase/functions/enviar-asistencia-buk/index.ts`: Edge Function para enviar asistencia a Buk/Ctrlit.
- `supabase/migrations`: migraciones de base de datos y Storage.

## Probar localmente

```bash
python -m http.server 5500
```

Abrir:

```text
http://localhost:5500/asistencia-web.html
```

## Configuracion

Editar `supabase-config.js` si cambia el proyecto Supabase o el CSV.

Los secretos no van en GitHub. Configurarlos en Supabase:

```bash
supabase secrets set CTRLIT_API_TOKEN=...
supabase secrets set CTRLIT_BASE_URL=https://app.ctrlit.cl/ctrl/api
supabase secrets set PABBLY_BUK_ERROR_WEBHOOK_URL=...
```

## Despliegue de Edge Function

```bash
supabase login
supabase link --project-ref cbplebkmxrkaafqdhiyi
supabase db push --include-all
supabase functions deploy enviar-asistencia-buk
```

## Notas de seguridad

- Las fotos de asistencia se guardan en bucket privado `asistencia-fotos`.
- Los rostros de referencia se guardan en bucket privado `rostros-referencia`.
- Solo usuarios admin pueden ver base de colaboradores, administracion y enrolamiento facial.
- La fecha/hora de marcas web se normaliza desde Supabase, no desde el equipo local.
