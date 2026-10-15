# Arquitectura del Sistema — Proyecto RIFA (80.000 Números)

## 1. Resumen Ejecutivo y Decisión Tecnológica

El sistema **Proyecto RIFA** ha sido diseñado para gestionar una rifa familiar masiva de **80.000 números** (del `00001` al `80000`) a un valor inicial de **ARS 100 por número**, con un presupuesto de operación obligatorio de **ARS 0 (Cero)**, garantizando concurrencia, alta disponibilidad en celulares y computadoras, persistencia transaccional y protección absoluta de datos personales.

### Stack Tecnológico Seleccionado
- **Frontend y Backend unificados:** **Next.js (React + TypeScript + Tailwind CSS)** en arquitectura App Router / Route Handlers.
- **Motor de Base de Datos:** **LibSQL / SQLite**.
  - *Entorno local:* Archivo local de base de datos (`file:./rifa.db`) con soporte ACID y modo WAL.
  - *Entorno en la nube:* Compatible al 100% con **Turso Database** (motor LibSQL/SQLite distribuido en el Edge con capa gratuita permanente de 9 GB y 1.000 millones de lecturas/mes sin tarjeta de crédito).
- **Seguridad y Criptografía:** `bcryptjs` para hash de contraseñas de administradores; tokens criptográficos de 192 bits (`crypto.randomBytes`) para enlaces privados de pedidos; tokens JWT firmados con `jose` en cookies `httpOnly`, `SameSite=Lax`.

---

## 2. Justificación Técnica y Comparativa de Alternativas

### ¿Por qué NO Streamlit?
- **Modelo de ejecución:** Streamlit reejecuta todo el script ante cada interacción del usuario. Con 80.000 números y decenas de usuarios concurrentes navegando desde celulares, el consumo de memoria se dispara y el navegador experimenta latencias inaceptables.
- **Conexiones WebSocket frágiles:** En navegadores móviles (Safari/Chrome en iOS y Android), las conexiones WebSocket de Streamlit se cortan frecuentemente al minimizar la pantalla o cambiar de red 4G/WiFi.
- **Concurrencia de administradores:** Streamlit no ofrece un modelo nativo de ruteo multi-página desacoplado ni gestión de sesiones HTTP seguras aisladas por administrador.

### ¿Por qué NO MySQL Server tradicional autohospedado?
- La presencia de *MySQL Workbench 8.0 CE* en el equipo del usuario es solo un cliente gráfico, no garantiza un servidor MySQL Server activo ni configurado.
- En despliegues gratuitos en la nube, los servicios gestionados de MySQL (PlanetScale, AWS RDS, etc.) han eliminado o severamente restringido sus niveles gratuitos.
- Exponer un MySQL Server local a Internet a través de un router doméstico introduce riesgos graves de seguridad de red y requiere configuración compleja de IP dinámica y puertos.

### Ventajas de Next.js + LibSQL / SQLite
1. **Rendimiento extremo:** Una base de 80.000 números indexada en SQLite ocupa únicamente ~4 MB. Consultas de disponibilidad, búsqueda puntual e inserciones tardan **menos de 0.2 milisegundos**.
2. **ACID y Prevención de Doble Reserva:** Mediante transacciones atómicas (`BEGIN IMMEDIATE`), el motor bloquea a nivel de transacción durante la reserva. Si dos compradores intentan apartar el mismo número simultáneamente, solo uno tiene éxito y el segundo recibe un mensaje claro de conflicto sin corromper el estado.
3. **Cero dependencias externas complejas:** En local se ejecuta con un único comando (`npm run dev`) sin necesidad de levantar contenedores pesados ni demonios de bases de datos.
4. **Cero costos obligatorios ($0):** Permite ejecutarse tanto localmente con túnel seguro gratuito (Cloudflare Tunnel) como en plataformas serverless gratuitas (Vercel + Turso).

---

## 3. Las Tres Interfaces del Sistema

El sistema implementa tres espacios desacoplados conectados a la misma fuente de verdad:

```
                              ┌────────────────────────────────────────┐
                              │         BASE DE DATOS CENTRAL          │
                              │            (LibSQL / SQLite)           │
                              │  - 80.000 números indexados            │
                              │  - Pedidos, Solicitudes y Pagos        │
                              │  - Cuentas de 2 Administradores        │
                              │  - Configuración dinámica del sorteo   │
                              │  - Registro de auditoría (Audit Logs)  │
                              └────────────────────────────────────────┘
                                    ▲               ▲               ▲
                                    │               │               │
            ┌───────────────────────┴─┐   ┌─────────┴─────────────┐ │
            │                         │   │                       │ │
┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
│     PORTAL PÚBLICO    │ │    CONSULTA PRIVADA   │ │  PANEL ADMINISTRATIVO │
│   (Venta y Reserva)   │ │  (/pedido/[token])    │ │       (/admin)        │
│                       │ │                       │ │                       │
│ - Búsqueda de números │ │ - Recibo digital      │ │ - Dashboard métricas  │
│ - Selección múltiple  │ │ - Números asignados   │ │ - Validación de pagos │
│ - Azar (1, 5, 10 nros)│ │ - Estado en tiempo    │ │ - Ventas directas     │
│ - Carrito interactivo │ │   real (Pendiente/    │ │ - Liberar vencidos    │
│ - Datos del comprador │ │   Pagado/Vencido)     │ │ - Configuración       │
│ - Instrucciones pago  │ │ - Botón copiar enlace │ │ - Exportar CSV        │
│ - Cero datos ajenos   │ │ - Contacto WhatsApp   │ │ - Copias de seguridad │
└───────────────────────┘ └───────────────────────┘ └───────────────────────┘
```

### A. Portal Público (`/`)
- Diseñado Mobile-First con Tailwind CSS, optimizado para celulares de cualquier gama.
- Muestra métricas públicas (números disponibles, precio por número, premios confirmados o a confirmar, fecha del sorteo a confirmar).
- **Selector de números optimizado:** No descarga los 80.000 números al cliente. La interfaz consulta mediante paginación inteligente, búsqueda directa y función de "Selección al azar" (1, 3, 5, 10 o 20 números disponibles).
- **Proceso de reserva:**
  1. El comprador elige sus números y completa Nombre, Apellido y Celular.
  2. Selecciona método de pago: *Efectivo* o *Transferencia bancaria*.
  3. El servidor valida la disponibilidad real en una transacción atómica, calcula el importe en backend (nunca confía en valores del cliente), genera la orden con código legible (ej. `RF-A83B`) y un token privado criptográfico de alta entropía.
  4. Redirige a la pantalla de éxito con el enlace privado único.

### B. Consulta Privada del Comprador (`/pedido/[token]`)
- Acceso exclusivo mediante token criptográfico no predecible (192 bits).
- Muestra el comprobante virtual de la reserva: números asignados, total a pagar, estado del pago (*Pendiente*, *Pagado*, *Vencido*, *Cancelado*), alias/CBU de transferencia, y enlace directo a WhatsApp para enviar el comprobante.
- No expone enlaces a pedidos de otros usuarios ni requiere crear contraseñas.

### C. Panel Administrativo Privado (`/admin`)
- Protegido por autenticación individual para los dos administradores (esposo y esposa).
- Acceso con usuario y contraseña únicos (hash bcrypt).
- **Secciones:**
  - **Dashboard:** Resumen en tiempo real: disponibles, reservados, vendidos, cobrado en efectivo vs transferencia, recaudación potencial restante.
  - **Ventas Directas:** Permite a los administradores registrar ventas presenciales (mano a mano) marcándolas inmediatamente como pagadas o reservadas.
  - **Solicitudes Web:** Listado de pedidos recibidos por la web, con filtros por estado, verificación de comprobantes y botón de confirmación de pago con 1 clic.
  - **Gestión de Números:** Buscador global de los 80.000 números para conocer al instante el estado o comprador de un número específico.
  - **Gestión de Compradores:** Listado de compradores con búsqueda por nombre o teléfono, permitiendo recuperar el enlace privado de un comprador si este lo extravió.
  - **Configuración del Sistema:** Modificación en vivo (sin tocar código) del precio de la rifa, premios, fecha del sorteo, CBU/Alias bancario, teléfono de contacto y tiempo de expiración de reservas.
  - **Auditoría e Historial:** Registro inmutable de cada acción sensible (quién confirmó un pago, quién canceló una reserva, quién modificó la configuración).
  - **Respaldos y Exportación:** Exportación de datos a formato CSV y descarga/restauración de copias de seguridad de la base de datos.

---

## 4. Manejo de Concurrencia y 80.000 Números

### Integridad Referencial y Concurrencia
- La tabla `numbers` contiene 80.000 filas con el número (`1` a `80000`) como clave primaria y un índice sobre `status` (`'available'`, `'reserved'`, `'sold'`).
- La reserva se efectúa dentro de una transacción exclusiva:
  ```sql
  -- Pseudocódigo del flujo transaccional
  BEGIN IMMEDIATE;
  -- 1. Verificar que TODOS los números solicitados sigan en estado 'available'
  -- 2. Si alguno ya no está disponible -> ROLLBACK y retornar error de conflicto
  -- 3. Crear el registro en 'orders' con el importe histórico
  -- 4. Actualizar los números solicitados a 'reserved' con el id de orden
  COMMIT;
  ```
- Este diseño garantiza que **nunca se produzca una doble asignación** y que **no existan asignaciones parciales** (si se piden 5 números y 1 fue tomado por otra persona un milisegundo antes, la operación se cancela limpiamente sin reservar los otros 4).

### Expiración de Reservas sin Costo ($0)
Para no depender de un servicio de tareas programadas pago (Cron externo):
1. **Liberación reactiva (Lazy Cleanup):** Antes de cualquier consulta de números disponibles o creación de reserva, el backend ejecuta una consulta ultra-rápida (menos de 1 ms) que pasa a `'available'` los números de pedidos con `payment_status = 'pending'` cuya fecha `expires_at` sea menor al momento actual, marcando el pedido como `'expired'`.
2. **Liberación manual desde el Panel:** Los administradores cuentan con un botón "Liberar reservas vencidas" en el panel que ejecuta la limpieza y reporta cuántos números fueron devueltos al público.

---

## 5. Matriz de Costos y Presupuesto ($0 Obligatorio)

| Componente | Servicio Elegido | Límite del Plan Gratuito | Costo Obligatorio |
| :--- | :--- | :--- | :--- |
| **Alojamiento Web** | Vercel Hobby o Servidor Local | 100 GB ancho de banda/mes, funciones serverless gratuitas ilimitadas para uso personal | **$0** |
| **Túnel Público (si es local)** | Cloudflare Tunnel (`cloudflared`) | Tráfico ilimitado, certificado SSL gratis, sin abrir puertos | **$0** |
| **Base de Datos** | SQLite local / Turso LibSQL Edge | 9 GB de almacenamiento (la base completa pesa ~4 MB), 1.000M lecturas/mes | **$0** |
| **Autenticación** | JWT interno con cookies `httpOnly` | Sin límites, implementado con criptografía nativa | **$0** |
| **Mensajería / Pagos** | Enlace `wa.me` directo + Transferencia bancaria | Verificación manual sin comisiones de pasarelas | **$0** |
| **Dominio** | Subdominio gratuito (`.vercel.app` o `.trycloudflare.com`) | Certificado HTTPS automático incluido | **$0** |

---

## 6. Procedimiento de Respaldo y Recuperación

1. **Exportación de Datos (CSV):** Desde el panel de administración, se generan archivos CSV tabulados con todas las órdenes, compradores y asignaciones de números.
2. **Copia de Seguridad Física (Dump / Snapshot):** El script `scripts/backup.mjs` genera una copia completa e íntegra del archivo de base de datos con marca de tiempo en la carpeta `backups/`.
3. **Restauración Verificada:** El script `scripts/restore.mjs` permite restablecer la base de datos a partir de cualquier copia de seguridad generada previamente, validando la integridad referencial de los 80.000 números.
