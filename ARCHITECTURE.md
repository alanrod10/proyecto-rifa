# Arquitectura del Sistema — Proyecto RIFA (100.000 Números)

## 1. Resumen Ejecutivo y Especificaciones Técnicas

El sistema **Proyecto RIFA** gestiona una rifa solidaria familiar de **100.000 números** (desde el `00001` hasta el `100000`), a un valor de **ARS 100 por número**, diseñado bajo la premisa de **costo operativo obligatorio de ARS $0 (Cero)**.

La arquitectura garantiza:
- **Consistencia ACID:** Prevención estricta de asignaciones dobles o parciales.
- **Alta disponibilidad móvil:** Cero colapsos de memoria en navegadores de celulares económicos mediante paginación indexada y consultas acotadas.
- **Privacidad absoluta:** Aislamiento criptográfico de pedidos sin exposición de datos de compradores en APIs públicas.
- **Persistencia dual flexible:** Ejecución local con SQLite/WAL o despliegue en la nube serverless con Turso LibSQL.

### Pila Tecnológica Implementada

| Capa | Tecnología | Versión | Rol Arquitectónico |
| :--- | :--- | :--- | :--- |
| **Frontend & Backend** | [Next.js](https://nextjs.org/) (React + TypeScript) | `15.2.4` / `19.0.0` | Arquitectura unificada App Router con Server Components y Route Handlers. |
| **Estilos & Diseño** | [Tailwind CSS](https://tailwindcss.com/) | `4.0.12` | Motor de estilos con tokens semánticos nativos `@theme`, temas Claro y Oscuro. |
| **Iconos** | [Lucide React](https://lucide.dev/) | `1.16.0` | Iconografía SVG reactiva optimizada. |
| **Base de Datos** | [LibSQL](https://github.com/tursodatabase/libsql-client-ts) / SQLite | `0.14.0` | Motor relacional ligero, transacciones ACID, modo WAL y compatibilidad con Turso Edge. |
| **Autenticación** | [Jose](https://github.com/panva/jose) & [Bcryptjs](https://github.com/dcodeIO/bcrypt.js) | `6.0.8` / `3.0.2` | Hasheo criptográfico de claves y firma de JWT (HS256) en cookies `httpOnly`. |

---

## 2. Diagrama de Topología del Sistema

```
                                  ┌───────────────────────────────────────────────┐
                                  │             BASE DE DATOS CENTRAL             │
                                  │        (LibSQL / SQLite - WAL Mode)           │
                                  │                                               │
                                  │  - 100.000 números indexados (numbers)        │
                                  │  - Pedidos y comprobantes (orders)            │
                                  │  - Directorio de compradores (buyers)         │
                                  │  - Administradores individuales (admins)      │
                                  │  - Configuraciones dinámicas (settings)       │
                                  │  - Historial de auditoría inmutable (audit)   │
                                  └───────────────────────────────────────────────┘
                                         ▲                ▲                ▲
                                         │                │                │
                    ┌────────────────────┴───┐   ┌────────┴─────────────┐  │
                    │                        │   │                      │  │
        ┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
        │     PORTAL PÚBLICO    │ │    CONSULTA PRIVADA   │ │  PANEL ADMINISTRATIVO │
        │        ( / )          │ │  ( /pedido/[token] )  │ │       ( /admin )      │
        │                       │ │                       │ │                       │
        │ - Visualizador 100k   │ │ - Token 192 bits      │ │ - Sesión JWT 7 días   │
        │ - Carrito flotante    │ │ - Comprobante digital │ │ - Dashboard métricas  │
        │ - Selector al azar    │ │ - Estado en vivo      │ │ - Solicitudes web     │
        │ - Reserva atómica     │ │ - Datos de transfer.  │ │ - Ventas directas     │
        │ - Cero datos ajenos   │ │ - Contacto WhatsApp   │ │ - Direct. Compradores │
        │ - Modo Claro / Oscuro │ │ - Sin contraseña      │ │ - Gestor de 100k n°   │
        │                       │ │                       │ │ - Configuración       │
        │                       │ │                       │ │ - Descarga Backups    │
        └───────────────────────┘ └───────────────────────┘ └───────────────────────┘
```

---

## 3. Modelo de Datos y Esquema Relacional

El esquema está definido en [`src/lib/schema.sql`](src/lib/schema.sql) y optimizado con índices específicos para consultas de alta velocidad (< 1 ms):

```sql
-- 1. Tabla de Números (100.000 registros indexados)
CREATE TABLE IF NOT EXISTS numbers (
  number INTEGER PRIMARY KEY,                      -- 1 al 100000
  status TEXT NOT NULL DEFAULT 'available',        -- 'available' | 'reserved' | 'sold'
  order_id INTEGER,                                -- FK a orders(id)
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_numbers_status ON numbers(status);
CREATE INDEX IF NOT EXISTS idx_numbers_order_id ON numbers(order_id);

-- 2. Tabla de Compradores
CREATE TABLE IF NOT EXISTS buyers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_buyers_phone ON buyers(phone);

-- 3. Tabla de Pedidos / Órdenes
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,                       -- Código legible: RF-XXXXXX
  buyer_id INTEGER NOT NULL,                       -- FK a buyers(id)
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  payment_method TEXT NOT NULL,                    -- 'cash' | 'transfer'
  payment_status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'paid' | 'expired' | 'cancelled'
  unit_price REAL NOT NULL DEFAULT 100,            -- Precio histórico congelado al reservar
  numbers_count INTEGER NOT NULL,
  total_amount REAL NOT NULL,                      -- Monto histórico calculado en backend
  numbers_list TEXT NOT NULL,                      -- Array JSON con los números: "[101, 102]"
  private_token TEXT UNIQUE NOT NULL,              -- Token de 192 bits para /pedido/[token]
  expires_at DATETIME NOT NULL,                    -- Plazo límite de pago (48 hs por defecto)
  paid_at DATETIME,
  confirmed_by_admin TEXT,                         -- Nombre del admin que validó el pago
  is_direct_sale BOOLEAN DEFAULT 0,
  created_by_admin TEXT,
  notes TEXT,
  request_id TEXT,                                 -- UUID de idempotencia generado por el cliente
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_orders_code ON orders(code);
CREATE INDEX IF NOT EXISTS idx_orders_token ON orders(private_token);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_status_expires ON orders(payment_status, expires_at);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_phone ON orders(buyer_phone);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_request_id ON orders(request_id) WHERE request_id IS NOT NULL;

-- 4. Tabla de Cuentas Administrativas
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,                   -- 'alan' | 'yilda' (o 'esposa')
  password_hash TEXT NOT NULL,                     -- Hash bcrypt con 10 rondas de salt
  display_name TEXT NOT NULL,                      -- 'Alan' | 'Yilda'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de Configuración Dinámica
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabla de Auditoría Inmutable
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_username TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabla de Rate Limiting por IP y Ventana Temporal
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window_start)
);
```

---

## 4. Control de Concurrencia y Atomicidad (ACID)

### A. Prevención de Doble Asignación, Idempotencia y Topes Operativos
Al solicitar una reserva en `/api/reservations`:
1. Se aplica **rate limiting por IP** (`x-forwarded-for`): máximo 5 solicitudes cada 10 minutos (`HTTP 429`).
2. **Idempotencia (`client_request_id`):** Si el `request_id` ya existe en `orders.request_id` (índice `UNIQUE`), el servidor devuelve la orden existente con `HTTP 200` sin duplicar la reserva.
3. El backend valida los topes configurables en `settings`:
   - `max_numbers_per_order` (default `2000`): tope de números por pedido, consultados en bloques `IN` de hasta 500 variables.
   - `max_pending_numbers_per_phone` (default `1000`): tope acumulado de boletos en estado `pending` para un mismo celular, validado dentro de la transacción de escritura.
4. El backend abre una transacción de escritura exclusiva (`client.transaction('write')`).
5. Verifica que **todos** los números solicitados posean `status = 'available'` y ejecuta `UPDATE numbers SET status = 'reserved', order_id = ? WHERE number IN (...) AND status = 'available'`, exigiendo que `rowsAffected === cantidad de números`; ante cualquier discrepancia ejecuta `ROLLBACK` y devuelve `HTTP 409 Conflict`.

### B. Prevención de "Pagos Fantasma" y Confirmación en Lote
Para evitar que un administrador confirme accidentalmente un pago sobre una orden que ya expiró o fue cancelada:
- La consulta de confirmación en `/api/admin/orders` (tanto individual `confirm_payment` como en lote `confirm_payment_batch`, donde cada orden se procesa en su propia transacción) verifica que la orden mantenga `payment_status = 'pending'` y que los números vinculados continúen en estado `'reserved'` (`rowsAffected === expectedCount`).

---

## 5. Optimización de Lecturas a Turso, Caché y Expiración Reactiva ($0)

1. **Contadores por Índice (`idx_numbers_status`):** En `getPublicSettingsAndStats`, `/api/admin/dashboard` y `/api/admin/backup`, se calcula `sold` y `reserved` con `COUNT(*) WHERE status = 'sold' / 'reserved'` y se deriva `available = TOTAL_NUMBERS - reserved - sold` (`TOTAL_NUMBERS = 100000`), evitando escaneos completos sobre las 100.000 filas.
2. **Caché de 10 s y Paginación sin OFFSET:**
   - `getPublicSettingsAndStats` mantiene caché en memoria por instancia con TTL de 10 s (invalidada al reservar, confirmar o modificar ajustes).
   - `GET /api/settings` y `GET /api/numbers` (excepto `random`) emiten `Cache-Control: public, s-maxage=10, stale-while-revalidate=30`, y `src/app/page.tsx` utiliza `revalidate = 10`.
   - `GET /api/numbers` resuelve `filter=all` por rango primario directo (`BETWEEN ? AND ?`) y `filter=available` mediante paginación por cursor (`WHERE status = 'available' AND number > ? ORDER BY number ASC LIMIT ?`).
3. **Limpieza Perezosa con Throttle:**
   - En los `GET` públicos se ejecuta `releaseExpiredReservationsThrottled()` (máximo una vez cada 60 s por instancia).
   - En `POST /api/reservations`, `POST /api/admin/direct-sale` y todas las acciones de `/api/admin/orders`, `releaseExpiredReservations()` se ejecuta sin throttle.
4. **Liberación Forzada desde el Panel:** El panel administrativo dispone de `/api/admin/release-expired` para liberar manualmente reservas vencidas en cualquier momento.

---

## 6. Autenticación, Sesiones y Seguridad Perimetral

1. **Hasheo de Contraseñas:** Algoritmo `bcrypt` con 10 rondas de salting (`$2b$10$...`).
2. **Sesiones Criptográficas y Middleware:** Tokens JWT emitidos con `jose` (HS256, `ADMIN_SECRET_KEY`). `src/middleware.ts` protege todas las rutas `/admin/*` (excepto `/admin/login`) verificando el JWT de la cookie `rifa_admin_session`, además de mantener `getCurrentAdmin()` en cada API administrativa. Las rutas `/consultar` y `/admin/*` declaran `robots: noindex, nofollow`.
3. **Transporte de Sesión:** Cookie `rifa_admin_session` con `httpOnly: true`, `SameSite: 'Lax'` y vigencia de 7 días.
4. **Protección contra Fuerza Bruta y Abuso (Rate Limiting):**
   - **Login (`/api/admin/auth/login`):** Audita cada intento fallido en `audit_logs` (`ADMIN_LOGIN_FAILED`). Si se detectan 5 o más intentos fallidos desde una misma IP o usuario en una ventana de **15 minutos**, responde `HTTP 429 Too Many Requests`.
   - **Reservas (`POST /api/reservations`):** Máximo 5 reservas cada 10 minutos por IP (`rate_limits`).
   - **Consulta de órdenes (`GET /api/orders/[token]`):** Máximo 30 consultas cada 10 minutos por IP (`rate_limits`). Cuando se consulta por código corto (`RF-XXXXXX`), el servidor devuelve el celular enmascarado (`***1234`) y omite `private_token`.
5. **Sanitización contra Inyección de Fórmulas CSV:** En `/api/admin/export`, todas las celdas se procesan con `sanitizeCsvCell()`.

---

## 7. Persistencia Dual: Local y Cloud ($0)

El cliente unificado en [`src/lib/db.ts`](src/lib/db.ts) utiliza `@libsql/client` y detecta automáticamente el destino según la variable `DATABASE_URL`:

- **Entorno Local (Desarrollo y Self-Hosted):**
  - Configuración: `DATABASE_URL="file:./rifa.db"`
  - El motor opera sobre el archivo SQLite local en modo WAL (*Write-Ahead Logging*).
  - Admite publicación por Internet a costo $0 combinándolo con **Cloudflare Tunnel** (`cloudflared tunnel --url http://localhost:3000`).
- **Entorno en la Nube (Vercel Serverless):**
  - Configuración: `DATABASE_URL="libsql://tu-base.turso.io"`, `DATABASE_AUTH_TOKEN="token"`
  - Conexión sobre protocolo LibSQL HTTP/WebSocket hacia la red distribuida de Turso.
  - Almacena los 100.000 números y transacciones con persistencia real (resolviendo la limitación del sistema de archivos efímero de Vercel).

---

## 8. Estrategia de Copias de Seguridad y Recuperación

1. **Snapshot Binario con VACUUM INTO (`scripts/backup.mjs`):** Genera una copia consistente en caliente de `rifa.db` sin bloquear las lecturas ni detener el servidor.
2. **Snapshot JSON Estructurado:** Genera un archivo `.json` con todas las métricas, configuraciones, compradores, órdenes y números ocupados. Funciona idénticamente tanto en SQLite local como en Turso Cloud.
3. **Descarga en 1 Clic desde el Panel (`/api/admin/backup`):** Permite a los administradores descargar una copia completa en formato JSON desde `/admin/configuracion` en cualquier momento.
4. **Restauración Verificada (`scripts/restore.mjs`):** Antes de aplicar cualquier reemplazo, verifica que el archivo de respaldo contenga la cantidad reglamentaria de números (100.000 registros) y genera una copia de seguridad preventiva (`pre_restore_<timestamp>.db`).
