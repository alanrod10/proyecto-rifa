# Proyecto RIFA — Sistema Integral de 80.000 Números

Aplicación web completa, transaccional y moderna de **costo operativo ARS $0** para gestionar una rifa solidaria familiar de **80.000 números** (del `00001` al `80000`) a un valor inicial de **ARS 100 por número**, orientada a recaudar fondos para afrontar las cuotas de un lote familiar.

- **URL de Producción (Vercel):** [proyecto-rifa.vercel.app](https://proyecto-rifa.vercel.app/)
- **Repositorio GitHub:** [github.com/alanrod10/proyecto-rifa](https://github.com/alanrod10/proyecto-rifa)

---

## 1. Problema que Resuelve

La venta masiva de 80.000 boletos de una rifa familiar presenta desafíos operativos críticos:
- **Riesgo de doble asignación:** Evitar que dos personas aparten o paguen el mismo número simultáneamente.
- **Sobrecarga del navegador móvil:** Cargar 80.000 números en un celular bloquea la interfaz si no se diseña con paginación optimizada e indexación eficiente.
- **Protección de datos personales:** Los compradores no deben ver nombres ni teléfonos de otros participantes.
- **Presupuesto cero ($0):** La infraestructura debe operar sin costos de licencias, pasarelas de pago con comisiones excesivas ni bases de datos de pago.
- **Administración compartida y coordinada:** Facilitar la gestión colaborativa entre **Alan** e **Yilda**, con trazabilidad completa de cada cobro y venta presencial o virtual.

---

## 2. Las Tres Interfaces del Sistema

1. **Portal Público (`/`):**
   - Interfaz Mobile-First rápida y accesible con selector de apariencia (Modo Claro predeterminado y Modo Oscuro).
   - Explorador de disponibilidad de 80.000 números mediante paginación reactiva, buscador directo y selección rápida al azar (+1, +3, +5, +10).
   - Carrito flotante interactivo y modal de solicitud de reserva.
   - Cálculo del monto exclusivamente en el servidor (prevención de manipulaciones).
   - Bloqueo transaccional exclusivo contra dobles reservas y reversión atómica ante conflictos.
   - Protección estricta de la privacidad: nunca se exponen datos de otros compradores en la API pública.

2. **Consulta Privada del Comprador (`/pedido/[token]` y `/consultar`):**
   - Acceso seguro mediante token criptográfico de 192 bits (`crypto.randomBytes`).
   - Comprobante digital en vivo con números asignados, total a pagar y estado del pedido (*Pendiente*, *Pagado*, *Vencido*, *Cancelado*).
   - Datos bancarios (Alias, CBU, Banco, Titular) para transferencias.
   - Enlace directo a WhatsApp con mensaje preformateado para enviar comprobantes a Alan (`3884152040`) o Yilda (`3884141514`).
   - Herramienta para buscar y recuperar el enlace mediante código de orden (`/consultar`).

3. **Panel Administrativo Protegido (`/admin`):**
   - Autenticación individual para los administradores (**Alan** e **Yilda**) con contraseñas hasheadas en `bcrypt` y protección contra fuerza bruta (rate limiting).
   - **Dashboard / Métricas:** Recaudación real en vivo (Efectivo vs. Transferencia), dinero pendiente, disponibilidad restante y alertas de reservas por vencer.
   - **Ventas Directas (`/admin/ventas`):** Registro de ventas mano a mano con cobro inmediato o pendiente y selección aleatoria.
   - **Solicitudes Web (`/admin/solicitudes`):** Validación de transferencias bancarias, confirmación en 1 clic y anulación controlada con liberación de números.
   - **Directorio de Compradores (`/admin/compradores`):** Agrupación inteligente por número telefónico, unificación de nombres, balance histórico y botón de resumen unificado por WhatsApp.
   - **Gestor de Números (`/admin/numeros`):** Trazabilidad completa de cada número del 1 al 80.000 con estado y comprador vinculado.
   - **Configuración en Vivo (`/admin/configuracion`):** Edición de premios, fecha de sorteo, cuentas bancarias, teléfonos de contacto, actualización de contraseñas de administradores y descarga de copias de seguridad en 1 clic.
   - **Auditoría (`/admin/auditoria`):** Registro cronológico inmutable de cada acción sensible realizada por cada administrador.
   - **Exportación:** Descarga de listados de pedidos, compradores y números en CSV compatible con Microsoft Excel.

---

## 3. Pila Tecnológica Real

- **Framework Full-Stack:** [Next.js](https://nextjs.org/) v15.2.4 (React 19.0.0, TypeScript 5.8.2).
- **Estilos y Diseño:** [Tailwind CSS](https://tailwindcss.com/) v4.0.12 con `@tailwindcss/postcss`, variables semánticas, tokens de color y tipografías `Inter` y `JetBrains Mono` vía `next/font/google`.
- **Iconografía:** [Lucide React](https://lucide.dev/) v1.16.0.
- **Base de Datos y Persistencia:**
  - Local / Self-hosted: SQLite mediante `@libsql/client` (`file:./rifa.db`) en modo WAL.
  - Producción Cloud ($0): Turso LibSQL Edge Database (`libsql://...`), 9 GB de almacenamiento y 1.000M lecturas/mes gratuitas.
- **Criptografía y Autenticación:** `bcryptjs` (hash de contraseñas con salting), tokens criptográficos aleatorios nativos de Node.js, sesiones JWT con `jose` firmadas en cookies `httpOnly`, `SameSite=Lax`.

---

## 4. Estructura del Proyecto

```
Proyecto RIFA/
├── backups/                     # Copias de seguridad automáticas (.db y .json)
├── scripts/                     # Utilidades operativas y de mantenimiento
│   ├── backup.mjs               # Generación de copia de seguridad WAL / Turso
│   ├── change-admin-password.mjs# Cambio interactivo de contraseña por consola
│   ├── init-db.mjs              # Inicialización de esquema y siembra de 80.000 números
│   ├── migrate-to-turso.mjs     # Asistente de sincronización a Turso Cloud
│   ├── restore.mjs              # Restauración de copias (.db o .json)
│   └── verify-tests.mjs         # Suite de 25 pruebas automatizadas en sandbox
├── src/
│   ├── app/                     # Rutas y páginas (Next.js App Router)
│   │   ├── admin/               # Panel administrativo y submódulos
│   │   │   ├── auditoria/       # Registro de auditoría
│   │   │   ├── compradores/     # Directorio telefónico de compradores
│   │   │   ├── configuracion/   # Ajustes de sorteo, contraseñas y backups
│   │   │   ├── login/           # Acceso seguro al panel
│   │   │   ├── numeros/         # Buscador global de los 80.000 números
│   │   │   ├── solicitudes/     # Gestión y confirmación de pedidos web
│   │   │   └── ventas/          # Registro de ventas presenciales directas
│   │   ├── api/                 # Endpoints REST y Route Handlers
│   │   │   ├── admin/           # APIs protegidas del panel
│   │   │   ├── numbers/         # Consulta paginada y números aleatorios
│   │   │   ├── orders/          # Detalle privado de pedido por token
│   │   │   ├── reservations/    # Creación transaccional de reservas
│   │   │   └── settings/        # Configuraciones públicas y estadísticas
│   │   ├── consultar/           # Búsqueda pública por código de pedido
│   │   ├── pedido/[token]/      # Comprobante digital privado
│   │   ├── globals.css          # Variables semánticas, Tailwind v4 y temas
│   │   ├── layout.tsx           # Layout raíz con script anti-flicker de tema
│   │   └── page.tsx             # Portada pública y selector de números
│   ├── components/
│   │   └── ThemeToggle.tsx      # Selector de tema oscuro/claro
│   └── lib/
│       ├── auth.ts              # Utilidades de autenticación JWT y bcrypt
│       ├── db.ts                # Conexión LibSQL/SQLite y auditoría
│       ├── schema.sql           # Esquema DDL con índices optimizados
│       └── utils.ts             # Normalización de celulares, fechas y códigos
├── .env.example                 # Plantilla documental de variables de entorno
├── ARCHITECTURE.md              # Documentación de arquitectura técnica
├── AUDITORIA_PRELANZAMIENTO.md  # Informe de auditoría técnica y regulatoria
├── DESIGN_SYSTEM.md             # Guía del sistema de diseño visual
├── MANUAL_ADMINISTRADORES.md    # Manual operativo para Alan e Yilda
├── package.json                 # Dependencias y scripts del proyecto
└── rifa.db                      # Base de datos SQLite activa local
```

---

## 5. Requisitos y Puesta en Marcha Local

### Requisitos del Entorno
- **Node.js:** Versión 20.x o 22.x LTS (recomendadas) o superior.
- **npm:** Versión 10.x o superior.
- **Sistema Operativo:** Compatible con Windows 10/11, Ubuntu Linux o Windows Subsystem for Linux (WSL).

### Paso a Paso para Iniciar en Desarrollo

1. **Abrir la terminal en el directorio del proyecto:**
   - En Windows (PowerShell / CMD):
     ```cmd
     cd "C:\Proyecto RIFA"
     ```
   - En Linux / WSL:
     ```bash
     cd "/mnt/c/Proyecto RIFA"
     ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar las variables de entorno:**
   ```bash
   cp .env.example .env.local
   ```
   *(Verificar que `DATABASE_URL="file:./rifa.db"` esté configurado para uso local).*

4. **Inicializar la base de datos y sembrar los 80.000 números:**
   ```bash
   npm run seed
   ```
   *Crea las tablas, índices, configuraciones iniciales, cuentas de administrador y genera los 80.000 registros indexados en lotes.*

5. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

6. **Abrir en el navegador:**
   - Portal Público: [http://localhost:3000](http://localhost:3000)
   - Panel de Administración: [http://localhost:3000/admin](http://localhost:3000/admin)
   - Consulta de Reserva: [http://localhost:3000/consultar](http://localhost:3000/consultar)

---

## 6. Scripts Disponibles en `package.json`

| Comando | Acción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo de Next.js en el puerto 3000. |
| `npm run build` | Compila la aplicación para producción generando las rutas optimizadas. |
| `npm run start` | Inicia el servidor optimizado tras la compilación de producción. |
| `npm run lint` | Ejecuta el análisis de linter de Next.js y TypeScript. |
| `npm run seed` | Inicializa el esquema DDL y puebla los 80.000 números (`scripts/init-db.mjs`). |
| `npm test` | Ejecuta la suite de **25 pruebas de verificación** en sandbox aislado (`scripts/verify-tests.mjs`). |
| `npm run backup` | Genera una copia de seguridad SQLite (`.db`) y un volcado JSON en `backups/`. |
| `npm run restore` | Restaura el último respaldo o un archivo específico previo control de integridad. |
| `npm run change-password` | Ejecuta la herramienta de cambio interactivo y enmascarado de contraseña. |
| `npm run migrate:turso` | Asistente por consola para migrar los datos locales a Turso Database. |

---

## 7. Cuentas de Acceso Administrativo

El sistema cuenta con dos administradores individuales con permisos completos:
- **Administrador 1:** Usuario `alan` | Nombre visible: **Alan**
- **Administradora 2:** Usuario `yilda` *(en instalaciones previas o referencias históricas: `esposa`)* | Nombre visible: **Yilda**

### Procedimiento Seguro de Cambio de Contraseña
Existen dos formas de modificar las contraseñas sin exponer secretos:
1. **Desde la Web:** Iniciar sesión en `/admin` e ir a **Configuración** (`/admin/configuracion` -> *Seguridad de Mi Cuenta*).
2. **Desde la Consola:** Ejecutar el script interactivo que solicita la clave enmascarada con asteriscos para no dejar rastros en el historial de comandos:
   ```bash
   npm run change-password alan
   npm run change-password yilda
   ```

---

## 8. Verificación y Suite de Pruebas

El proyecto cuenta con una suite automatizada de **25 pruebas obligatorias** que valida de extremo a extremo la lógica del sistema:
```bash
npm test
```
**Puntos validados (25/25):**
1. Disponibilidad pública de 80.000 números.
2. Selección múltiple de boletos.
3. Creación transaccional de reservas.
4. Cálculo estricto de importes en el backend.
5. Acceso mediante token criptográfico privado.
6. Confirmación de pago y transición a `sold`.
7. Registro de venta directa presencial.
8. Rechazo de números previamente vendidos (HTTP 409).
9. Concurrencia con bloqueo exclusivo ACID.
10. Prevención de reservas parciales (Rollback íntegro).
11. Expiración automática y liberación de números vencidos.
12. Rechazo de accesos no autorizados al panel.
13. Aislamiento y rechazo de tokens privados ajenos o falsificados.
14. Validación independiente de credenciales de ambos administradores.
15. Persistencia de datos entre reinicios.
16. Exportación a CSV con BOM UTF-8 para Excel.
17. Respaldo y restauración con verificación de 80.000 registros.
18. Simulación de fallo de red y reversión de transacciones.
19. Diseño responsive y barra flotante de carrito móvil.
20. Cero exposición de datos personales en APIs públicas.
21. Prevención de pagos fantasma en órdenes vencidas/canceladas.
22. Protección contra fuerza bruta (rate limiting) en login.
23. Normalización automática de números celulares con prefijo argentino (+54 9).
24. Sanitización contra inyección de fórmulas CSV y colisiones en códigos `RF-XXXXXX`.
25. Muestreo aleatorio optimizado en Turso y zona horaria de Jujuy (`America/Argentina/Jujuy`).

---

## 9. Copias de Seguridad y Restauración

### Crear Copia de Seguridad
- **Por Consola:**
  ```bash
  npm run backup
  ```
  Genera una copia binaria consistente con WAL (`VACUUM INTO`) y un archivo JSON estructurado en la carpeta `backups/`.
- **Desde el Panel Web:** En `/admin/configuracion`, pulsar el botón **Descargar Copia de Seguridad** para obtener el archivo JSON al instante.

### Restaurar Copia de Seguridad
- Restaura automáticamente el archivo más reciente (generando una copia preventiva antes de tocar nada):
  ```bash
  npm run restore
  ```
- O restaurar un archivo específico:
  ```bash
  node scripts/restore.mjs backups/backup_2026-10-15T18-46-28.db
  ```

---

## 10. Documentación Complementaria

- [`ARCHITECTURE.md`](ARCHITECTURE.md): Arquitectura transaccional, modelo de datos, flujos de seguridad y control de concurrencia.
- [`MANUAL_ADMINISTRADORES.md`](MANUAL_ADMINISTRADORES.md): Guía práctica paso a paso para la operativa diaria de Alan e Yilda.
- [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md): Especificación del sistema visual, temas claro y oscuro, tokens y animaciones.
- [`AUDITORIA_PRELANZAMIENTO.md`](AUDITORIA_PRELANZAMIENTO.md): Informe técnico de auditoría, seguridad y marco legal de juegos de azar en la Provincia de Jujuy.
