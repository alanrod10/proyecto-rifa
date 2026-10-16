# Proyecto RIFA — Sistema Integral de 80.000 Números

Aplicación web completa, profesional, segura y de **costo obligatorio ARS $0** para administrar una rifa familiar de **80.000 números** (del `00001` al `80000`) a un valor inicial de **ARS 100 por número**, orientada a recaudar fondos para pagar las cuotas de un lote familiar.

---

## 1. Características Principales

El sistema está dividido en tres espacios independientes conectados a la misma base central:

1. **Portal Público (`/`):**
   - Interfaz Mobile-First rápida, atractiva y moderna (Tailwind CSS).
   - Consulta dinámica de disponibilidad de los 80.000 números sin sobrecargar el navegador (paginación e índices sub-milisegundo).
   - Buscador de números específicos y selector rápido al azar (+1, +3, +5, +10).
   - Carrito flotante interactivo y modal de solicitud de reserva.
   - Cálculo del total exclusivamente en el servidor (prevención de manipulaciones).
   - Bloqueo atómico contra doble reserva y prevención de asignaciones parciales.
   - Protección absoluta de la privacidad: **nunca se exponen nombres ni teléfonos de otros compradores**.

2. **Consulta Privada del Comprador (`/pedido/[token]`):**
   - Acceso exclusivo mediante token criptográfico de alta entropía (192 bits).
   - Comprobante virtual con números asignados, total a pagar y estado en vivo (*Pendiente*, *Pagado*, *Vencido*, *Cancelado*).
   - Botón directo para enviar comprobante de pago por WhatsApp con texto preconfigurado.
   - Datos bancarios (Alias, CBU, Banco, Titular) para transferencias.
   - Botón para copiar el enlace privado.

3. **Panel Administrativo Protegido (`/admin`):**
   - Acceso individual con contraseñas protegidas por `bcrypt` para ambos administradores (**Alan** e **Yilda**).
   - **Resumen / Dashboard:** Métricas en vivo de recaudación efectiva (Efectivo vs. Transferencia), dinero pendiente, potencial restante y reservas por vencer.
   - **Ventas Directas:** Registro presencial mano a mano con selección múltiple o al azar.
   - **Solicitudes Web:** Verificación de pagos con confirmación en 1 clic y opción de cancelación con liberación de números.
   - **Gestor de 80.000 Números:** Buscador global de números con trazabilidad de comprador.
   - **Directorio de Compradores:** Búsqueda por nombre/celular y recuperación segura de enlaces privados.
   - **Configuración en Vivo:** Modificación de precios, premios, fecha del sorteo, datos bancarios y tiempo de expiración sin tocar código.
   - **Auditoría:** Registro inmutable de cada acción sensible (quién, qué y cuándo).
   - **Exportación:** Descarga de listados de pedidos, compradores y números en formato CSV (con BOM para Excel).

---

## 2. Pila Tecnológica y Arquitectura ($0 Presupuesto)

- **Framework:** Next.js (React + TypeScript + Tailwind CSS) con App Router y Route Handlers unificados.
- **Base de Datos:** LibSQL / SQLite (`file:./rifa.db`) con soporte ACID y modo WAL.
  - Opcional en la nube: Compatible 100% con **Turso Database** (motor LibSQL distribuido con 9 GB de almacenamiento y 1.000 millones de lecturas/mes gratuitos sin tarjeta).
- **Seguridad:** Criptografía nativa Node.js (`crypto.randomBytes`), `bcryptjs` y sesiones JWT firmadas con `jose` en cookies `httpOnly`.
- **Costo Operativo:** **ARS $0**. No requiere pasarelas de pago, servidores pagos ni servicios de SMS.

Documentación detallada en [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## 3. Instrucciones de Ejecución Local (Ubuntu / WSL / Windows)

### Requisitos Previos
- Node.js v20+ o v24+ (instalado).
- npm v10+ o v11+ (instalado).

### Pasos para Iniciar
```bash
# 1. Posicionarse en la carpeta del proyecto
cd "C:\Proyecto RIFA"  # (o en WSL: /mnt/c/Proyecto\ RIFA)

# 2. Configurar variables de entorno (si es la primera vez)
cp .env.example .env.local

# 3. Inicializar la base de datos y sembrar los 80.000 números
npm run seed

# 4. Iniciar el servidor de desarrollo
npm run dev
```

La aplicación estará disponible inmediatamente en:
- **Portal Público:** `http://localhost:3000`
- **Consulta de Reserva:** `http://localhost:3000/consultar`
- **Panel Administrativo:** `http://localhost:3000/admin`

### Cuentas de Administrador:
- **Administrador 1:** Usuario `alan` *(Contraseña configurable en `.env.local` o directamente desde el panel web en `/admin/configuracion`)*
- **Administradora 2 (Yilda):** Usuario `yilda` *(Contraseña configurable en `.env.local` o directamente desde el panel web en `/admin/configuracion`)*

---

## 4. Pruebas Automatizadas de Verificación

El proyecto incluye una suite de pruebas automatizadas que valida los **20 puntos obligatorios** de la directiva (concurrencia, rollback, doble reserva, expiración, autenticación y seguridad):

```bash
node scripts/verify-tests.mjs
```

---

## 5. Respaldos y Restauración

### Crear Copia de Seguridad
Genera una copia íntegra con marca de tiempo en la carpeta `backups/`:
```bash
npm run backup
```

### Restaurar Copia de Seguridad
Restaura la base activa validando la integridad de los 80.000 números (creando antes una copia preventiva):
```bash
npm run restore
# O especificando un archivo puntual:
node scripts/restore.mjs backups/backup_2026-10-15T16-52-05.db
```

---

## 6. Opciones de Publicación Gratuita ($0)

### Opción A: Vercel (Recomendada para acceso público 24/7)
1. Subir el repositorio a GitHub (modo Privado).
2. Crear una base gratuita en [Turso](https://turso.tech) (Plan gratuito $0, 9 GB de almacenamiento, no requiere tarjeta).
3. Obtener `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN`.
4. Conectar el repositorio en [Vercel](https://vercel.com) (Plan Hobby $0).
5. Configurar las variables en Vercel:
   - `DATABASE_URL` = `libsql://tu-base.turso.io`
   - `DATABASE_AUTH_TOKEN` = `tu_token`
   - `ADMIN_SECRET_KEY` = `clave_secreta_de_32_caracteres`
   - `NEXT_PUBLIC_APP_URL` = `https://tu-rifa.vercel.app`
6. ¡Listo! Despliegue automático con dominio HTTPS gratuito.

### Opción B: Cloudflare Tunnel desde tu PC (100% Local con acceso por Internet)
Si preferís que la base de datos `rifa.db` se quede exclusivamente en tu computadora sin usar servicios externos:
1. Instalar la herramienta gratuita `cloudflared` de Cloudflare.
2. Ejecutar: `cloudflared tunnel --url http://localhost:3000`
3. Cloudflare te dará al instante una URL pública HTTPS gratuita (ej: `https://palabras-aleatorias.trycloudflare.com`) accesible desde cualquier celular en el mundo sin abrir puertos en tu router y a costo $0.

---

## 7. Marco Legal y Requisitos Oficiales (Jujuy / Argentina)

- **Organismo Competente:** En la Provincia de Jujuy, el organismo oficial regulador de rifas, sorteos y juegos de azar es el **InProJuy (Instituto Provincial de Juegos de Azar de Jujuy)**, creado por Ley Provincial N° 6.114.
- **Situación Legal Verificada:**
  - Esta iniciativa es una **rifa solidaria familiar privada** organizada por y para el núcleo familiar con el objeto exclusivo de afrontar cuotas de un lote.
  - **No cuenta** con autorización ni resolución oficial expedida por InProJuy.
  - Por esta razón, **no debe publicitarse en medios de comunicación masivos con afirmaciones engañosas de autorización estatal**. En el portal público se transparenta claramente que se trata de una rifa solidaria familiar privada.
