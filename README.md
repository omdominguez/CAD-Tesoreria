# CAD · Herramienta de Tesorería y Proyección de Pagos (versión web compartida)

Aplicación web para **Comercializadora Agrícola Domínguez C.A. (El Maizalito)**.
Misma herramienta que ya conocías, ahora con **base de datos real y logins**: Compras,
Tesorería y Master entran cada uno con su usuario y ven la **misma información en vivo**.

- **Frontend:** React + Vite (una sola página, sin servidor propio que mantener).
- **Backend:** [Supabase](https://supabase.com) — base de datos PostgreSQL + autenticación.
- **Datos compartidos:** todo el equipo trabaja sobre el mismo espacio, con sincronización
  en tiempo real.

---

## 1. Requisitos

- **Node.js 18 o superior** (para correr y compilar). Descárgalo en https://nodejs.org
- Una cuenta gratuita en **https://supabase.com**

---

## 2. Crear la base de datos (Supabase) — se hace una sola vez

1. Entra a https://supabase.com → **New project**. Ponle un nombre (p. ej. `cad-tesoreria`)
   y guarda la contraseña de la base de datos.
2. Cuando el proyecto esté listo, ve a **SQL Editor → New query**.
3. Abre el archivo **`supabase/schema.sql`** de este proyecto, copia **todo** su contenido,
   pégalo y pulsa **Run**. Esto crea las tablas, los roles y la sincronización.
4. (Opcional, recomendado para empezar rápido) En **Authentication → Providers → Email**,
   desactiva *"Confirm email"* para que los usuarios entren de inmediato sin verificar correo.
   En producción puedes volver a activarlo.

> **El primer usuario que se registre queda como MASTER automáticamente.** Los demás entran
> como Compras y el Master les cambia el rol desde el panel **Equipo**.

---

## 3. Conectar la app con tu base

1. En Supabase ve a **Project Settings → API** y copia:
   - **Project URL**
   - **anon public** key
2. En la raíz de este proyecto, copia el archivo `.env.example` y renómbralo a **`.env`**:

   ```
   VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-anon-publica
   ```

---

## 4. Correr en tu computador

```bash
npm install       # instala dependencias (solo la primera vez)
npm run dev       # inicia la app en http://localhost:5173
```

Abre esa dirección en el navegador. Regístrate (serás el Master), y ya puedes usarla.
Como Master verás el botón **"Cargar datos de ejemplo"** para probar todo de una vez.

---

## 5. Publicarla para el equipo (despliegue gratuito)

La forma más simple es **Vercel** (también sirve Netlify):

1. Sube este proyecto a un repositorio en GitHub.
2. Entra a https://vercel.com → **Add New → Project** → importa el repositorio.
3. Vercel detecta Vite solo. En **Environment Variables** agrega las dos claves:
   `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (los mismos valores del `.env`).
4. **Deploy.** Te dará una URL pública (p. ej. `cad-tesoreria.vercel.app`) que compartes
   con tu equipo.

> Alternativa sin GitHub: `npm run build` genera la carpeta `dist/`, que puedes arrastrar
> a https://app.netlify.com/drop (recuerda configurar las variables de entorno allí también).

---

## 6. Cómo funcionan los roles

| Rol | Qué puede hacer |
|-----|-----------------|
| **Compras** | Crear proveedores, compromisos y financiamientos. No ve caja ni bancos. |
| **Tesorería** | Bancos, saldos, asignar banco pagador, registrar abonos, armar corridas. |
| **Master** | Todo + tablero ejecutivo + autorizar corridas + panel **Equipo** (asigna roles). |

Para dar de alta a un compañero: que se registre en la app → tú (Master) entras a **Equipo**
y le cambias el rol. También puedes hacerlo en Supabase → *Table editor → profiles*.

---

## 7. Notas importantes

- **Concurrencia:** los datos se guardan como un documento compartido. Para un equipo de
  tesorería (trabajo secuencial) funciona muy bien y se sincroniza en vivo. Si en el futuro
  necesitan que varias personas editen exactamente lo mismo al mismo segundo con mucha
  intensidad, el siguiente paso es separar cada entidad en su propia tabla relacional
  (la estructura ya está pensada para esa evolución, descrita en el documento de diseño).
- **Respaldos:** Supabase respalda tu base; además puedes exportar desde su panel cuando
  quieras.
- **Seguridad:** la clave `anon` es pública por diseño; el acceso real lo controlan las
  políticas RLS del `schema.sql` (solo usuarios autenticados leen/escriben; solo Master
  cambia roles).
- **Odoo:** la conciliación sigue siendo por número de pedido; esta herramienta es la capa
  visual y predictiva, no reemplaza el ERP.

---

## Estructura del proyecto

```
cad-web/
├─ index.html
├─ package.json
├─ vite.config.js
├─ .env.example              → cópialo como .env
├─ supabase/
│  └─ schema.sql             → ejecutar una vez en Supabase
└─ src/
   ├─ main.jsx               → arranque
   ├─ App.jsx                → login / carga / app
   ├─ auth.jsx               → sesión y rol del usuario
   ├─ Login.jsx              → pantalla de acceso
   ├─ supabase.js            → conexión con Supabase
   ├─ store.js               → lectura/escritura del estado compartido + realtime
   └─ Workspace.jsx          → toda la herramienta (tablero, módulos, corridas, equipo)
```
