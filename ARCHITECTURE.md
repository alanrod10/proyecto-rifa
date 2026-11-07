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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_orders_code ON orders(code);
CREATE INDEX IF NOT EXISTS idx_orders_token ON orders(private_token);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_phone ON orders(buyer_phone);

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
```

---

## 4. Control de Concurrencia y Atomicidad (ACID)

### A. Prevención de Doble Asignación y Asignaciones Parciales
Al solicitar una reserva en `/api/reservations`:
1. El backend abre una transacción de escritura exclusiva (`client.transaction('write')` o `BEGIN IMMEDIATE`).
2. Verifica en una sola consulta indexada que **todos** los números solicitados posean `status = 'available'`.
3. Si tan solo uno de los números solicitados ya no está disponible (fue tomado por otro comprador milisegundos antes):
   - Se ejecuta un **`ROLLBACK` íntegro e inmediato**.
   - No se crea la orden ni se bloquean los números restantes.
   - Se responde un código `HTTP 409 Conflict` detallando los números en colisión.
4. Si todos están disponibles:
   - Se crea el registro del comprador (`buyers`).
   - Se crea el pedido (`orders`) con el monto histórico congelado.
   - Se actualizan los números a `'reserved'`, asociándolos al `order_id`.
   - Se ejecuta el `COMMIT`.

### B. Prevención de "Pagos Fantasma"
Para evitar que un administrador confirme accidentalmente un pago sobre una orden que ya expiró o fue cancelada:
- La consulta de confirmación en `/api/admin/orders` verifica dentro de la transacción que la orden mantenga `payment_status = 'pending'` y que los números vinculados continúen en estado `'reserved'`. Si los números ya fueron reasignados o devueltos al público, la confirmación se rechaza de forma segura.

---

## 5. Expiración Reactiva y Gestión del Ciclo de Vida ($0)

Para evitar la contratación de servicios de tareas programadas externos (Cron jobs de pago):
1. **Limpieza Perezosa (Lazy Cleanup):** Antes de resolver cualquier consulta pública de números (`/api/numbers`) o creación de reserva (`/api/reservations`), el backend ejecuta una consulta optimizada que busca pedidos con `payment_status = 'pending'` y `datetime(expires_at) < datetime('now')`.
   - Devuelve los números asociados al estado `'available'`.
   - Marca la orden como `'expired'`.
2. **Liberación Forzada desde el Panel:** El panel administrativo dispone de la acción `/api/admin/release-expired`, que permite a los administradores liberar manualmente números vencidos en cualquier momento y recibir un resumen de cuántos números se reintegraron.

---

## 6. Autenticación, Sesiones y Seguridad Perimetral

1. **Hasheo de Contraseñas:** Algoritmo `bcrypt` con 10 rondas de salting (`$2b$10$...`).
2. **Sesiones Criptográficas:** Tokens JWT emitidos con la librería `jose`, firmados mediante el algoritmo HS256 utilizando la variable de entorno `ADMIN_SECRET_KEY` (mínimo 32 caracteres).
3. **Transporte de Sesión:** Cookie protegida `rifa_admin_session` con flags `httpOnly: true`, `SameSite: 'Lax'` y `path: '/'`, con vigencia de 7 días.
4. **Protección contra Fuerza Bruta (Rate Limiting):**
   - El endpoint `/api/admin/auth/login` audita cada intento fallido en `audit_logs` con la acción `ADMIN_LOGIN_FAILED`.
   - Si se detectan más de 5 intentos fallidos desde una misma IP o hacia un mismo usuario en una ventana de 10 minutos, el sistema bloquea temporalmente las peticiones respondiendo `HTTP 429 Too Many Requests`.
5. **Sanitización contra Inyección de Fórmulas CSV:** En el endpoint `/api/admin/export`, todas las celdas se procesan con `sanitizeCsvCell()`: si un campo de texto comienza con `=`, `+`, `-` o `@`, se prefija con una comilla simple (`'`) para evitar la ejecución arbitraria de fórmulas en Microsoft Excel.

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
