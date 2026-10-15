# Informe de Auditoría Técnica y de Seguridad Previa al Lanzamiento
## Proyecto RIFA (80.000 Números) — `C:\Proyecto RIFA`
**Fecha de la Auditoría:** Octubre 2026  
**Estado General:** Aprobado con observaciones operativas y recomendaciones críticas antes de abrir al público.

---

## 1. Resumen Ejecutivo y Preservación de Datos

Se realizó una auditoría integral técnica, criptográfica, transaccional y legal sobre el código fuente, la base de datos y la configuración del sistema.

### Estado Inicial de los Datos Verificado
- **Archivo de base de datos activa:** `rifa.db` (5.38 MB).
- **Total de números:** 80.000 registros indexados (del `00001` al `80000`).
- **Estado de los números:** 80.000 disponibles (0 reservados, 0 vendidos).
- **Órdenes reales registradas:** 0 órdenes (base limpia, sin residuos de pruebas).
- **Cuentas administrativas registradas:**
  - `alan` (Nombre visible: Alan).
  - `yilda` (Nombre visible: Yilda).
- **Copia de seguridad preventiva generada y verificada:**
  - Archivo: `backups/backup_2026-10-15T17-50-01.db` (5.38 MB).
  - Metadatos: `backups/backup_2026-10-15T17-50-01.json`.
  - Integridad: 80.000 números verificados sin pérdida de información.

---

## 2. Auditoría de Credenciales y Gestión de Secretos

### Problemas Detectados
1. **Contraseñas iniciales expuestas:** Durante las sesiones de desarrollo, las contraseñas iniciales fueron mencionadas en el historial de chat y en archivos de documentación previa. **Deben considerarse vulneradas y no aptas para producción.**
2. **Ausencia de mecanismo seguro de cambio de clave:** El sistema no disponía de un procedimiento asistido para que Alan e Yilda pudieran actualizar sus contraseñas sin manipular directamente la base de datos en SQL.

### Acciones Correctivas Implementadas
1. **Almacenamiento en Base de Datos:** Se verificó que las contraseñas se almacenan mediante hash seguro `bcrypt` con 10 rondas de salting (`$2b$10$...`). Nunca se guardan en texto plano en la base de datos ni en el repositorio.
2. **Utilidad Segura e Interactiva de Cambio de Clave (`scripts/change-admin-password.mjs`):**
   - Se implementó un script interactivo en Node.js que solicita la contraseña de forma enmascarada (mostrando asteriscos `*`) en la terminal y pide confirmación previa antes de escribir en disco.
   - **Cero fugas de historial:** Al ingresar la contraseña interactivamente, la clave **nunca queda guardada en el historial de comandos del shell (`~/.bash_history`) ni en la tabla de procesos (`ps aux`)**.
   - Si se intenta ingresar la clave como argumento de consola, el script emite una advertencia de seguridad explícita.
   - Requiere un mínimo estricto de 8 caracteres y valida coincidencia exacta con la confirmación.
   - Genera el hash `bcrypt` en memoria y actualiza atómicamente la tabla `admins`.
   - Registra el evento en la tabla `audit_logs` con la acción `CHANGE_PASSWORD`, **sin registrar la contraseña ni el hash** en los registros de auditoría.
   - Uso recomendado:
     ```bash
     npm run change-password alan
     npm run change-password yilda
     ```
3. **Secreto de Sesión JWT (`ADMIN_SECRET_KEY`):**
   - Las sesiones de los administradores se firman mediante tokens JWT (algoritmo HS256) emitidos en cookies `httpOnly`, `SameSite=Lax`, con vigencia de 7 días.
   - Se añadió un mecanismo de detección proactiva en `src/lib/auth.ts`: si la aplicación se ejecuta en modo producción (`NODE_ENV=production`) sin haber configurado `ADMIN_SECRET_KEY`, el sistema emite una alerta de seguridad visible en los registros.
   - **Obligatorio para producción:** Definir en `.env.local` una clave aleatoria de al menos 32 caracteres generada criptográficamente:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```

---

## 3. Base de Datos, Persistencia y Entorno de Despliegue

### Estado de Despliegue Real Actual
- **Repositorio Git:** Inicializado localmente en rama `main`. **No tiene remotos configurados** (no está subido a GitHub ni GitLab).
- **Despliegue en la Nube:** **No está publicado en Internet.** No existen configuraciones activas de Vercel ni proveedores serverless en el entorno.

### Hallazgo Crítico de Arquitectura (Persistencia de Archivo Local vs. Servidor Serverless)
- El cliente de base de datos (`src/lib/db.ts`) utiliza `@libsql/client`.
- **En entorno local (Desarrollo o Auto-hospedado con Cloudflare Tunnel):**
  - La base de datos reside en el archivo local `rifa.db`.
  - Los datos son **100% persistentes** entre reinicios y reinicios de la máquina.
  - Se corrigió la resolución de rutas en `src/lib/db.ts` para que cualquier ruta `file:./rifa.db` se transforme automáticamente en ruta absoluta (`path.resolve(process.cwd(), filePath)`), evitando fallos cuando el proceso de Node.js se ejecuta desde directorios secundarios.
- **En caso de despliegue en Vercel u otra plataforma Serverless:**
  - **ADVERTENCIA TÉCNICA OBLIGATORIA:** Las funciones serverless de Vercel tienen un sistema de archivos efímero (`/tmp`) y de solo lectura. **Un archivo SQLite local NO persiste en Vercel.** Si se despliega con `file:./rifa.db`, los datos se perderán con cada nueva ejecución o despliegue.
  - **Solución $0 verificada:** Para desplegar en Vercel manteniendo el costo cero ($0), se debe crear una base de datos gratuita en **Turso** (motor LibSQL distribuido con 9 GB de almacenamiento y 1.000 millones de lecturas mensuales gratis sin tarjeta de crédito). En Vercel simplemente se configuran las variables de entorno:
    ```env
    DATABASE_URL="libsql://nombre-de-tu-db.turso.io"
    DATABASE_AUTH_TOKEN="tu_token_generado_en_turso"
    ```
    El código de `src/lib/db.ts` ya es nativamente compatible con Turso sin necesidad de cambiar una sola línea de código.

---

## 4. Auditoría de Integridad Transaccional y de Operaciones

Se auditó minuciosamente el código de los endpoints y los controladores de datos:

| Requisito de Integridad | Mecanismo en Código | Estado de Verificación |
| :--- | :--- | :---: |
| **Prevención de Doble Reserva** | Transacción exclusiva (`BEGIN IMMEDIATE`). Comprobación atómica de `status = 'available'` antes de apartar números. Si alguno fue tomado, se cancela la operación y se responde HTTP 409 Conflict con la lista de números en conflicto. | **VERIFICADO (ACID)** |
| **Atomicidad en Múltiples Números** | Si se solicitan N números y 1 falla, se ejecuta `ROLLBACK` total. No quedan reservas huérfanas ni asignaciones parciales. | **VERIFICADO** |
| **Liberación de Reservas Vencidas** | Comprobación reactiva automática ante cada consulta pública y botón manual en el panel (`/admin`). Devuelve a `'available'` los números de órdenes con `payment_status = 'pending' AND datetime(expires_at) < datetime('now')`. | **VERIFICADO** |
| **Contabilización de Dinero** | Las métricas de recaudación (`src/app/api/admin/dashboard/route.ts`) calculan `money_collected_total` exclusivamente mediante `WHERE payment_status = 'paid'`. Los pedidos pendientes no suman al dinero cobrado. | **VERIFICADO** |
| **Precios Históricos** | Al crear una orden, se registra el `unit_price` y el `total_amount` vigentes en ese momento. Modificaciones futuras del precio no recalculan órdenes preexistentes. | **VERIFICADO** |
| **Aislamiento en Cancelaciones** | La anulación de pedidos ejecuta `UPDATE numbers SET status = 'available', order_id = NULL WHERE order_id = ?`. Afecta única y estrictamente a los números vinculados al identificador de la orden. | **VERIFICADO** |
| **Enlaces Privados Seguros** | La ruta `/pedido/[token]` busca por token criptográfico de 192 bits (`crypto.randomBytes(24)`). Devuelve exclusivamente los datos de esa orden. No existen identificadores secuenciales ni rutas de búsqueda pública por celular. | **VERIFICADO** |

---

## 5. Auditoría del Script de Pruebas y Pruebas en Vivo

### Corrección Crítica en `scripts/verify-tests.mjs`
- **Problema encontrado:** El script anterior ejecutaba sus pruebas de inserción, reserva y eliminación directamente sobre `rifa.db`, lo que representaba un riesgo crítico de corromper o borrar datos de compradores reales.
- **Corrección realizada:** Se refactorizó `scripts/verify-tests.mjs` para que trabaje sobre una **base de datos temporal aislada** (`backups/test_isolated.db`). El script clona la base en un entorno sandbox, ejecuta las 20 pruebas sobre la copia y elimina la base temporal en su bloque `finally`. **La base real `rifa.db` nunca es modificada por la suite de pruebas.**

### Pruebas Automatizadas Ejecutadas (20/20 Pasadas)
1. ✓ Consultar disponibilidad pública (80.000 números).
2. ✓ Selección múltiple de números.
3. ✓ Creación de solicitud con comprador.
4. ✓ Cálculo del importe en backend (3 × $100 = $300).
5. ✓ Consulta mediante token privado de 48 caracteres hex.
6. ✓ Confirmación de pago por administrador y transición a `sold`.
7. ✓ Registro de venta directa presencial por administradora Yilda (`@yilda`).
8. ✓ Rechazo de asignación de número ya vendido (HTTP 409).
9. ✓ Concurrencia simultánea con bloqueo ACID.
10. ✓ Prevención de asignaciones parciales (Rollback íntegro).
11. ✓ Expiración y liberación automática de números vencidos.
12. ✓ Rechazo criptográfico de accesos no autorizados al panel.
13. ✓ Rechazo de tokens privados falsificados (HTTP 404).
14. ✓ Validación independiente de credenciales para Alan e Yilda con display name correcto.
15. ✓ Persistencia de datos tras desconexión y reconexión del cliente.
16. ✓ Exportación a CSV compatible con Excel (BOM UTF-8).
17. ✓ Respaldo y restauración verificados con 80.000 registros intactos.
18. ✓ Simulación de falla de conexión y rollback transaccional exitoso.
19. ✓ Verificación de viewport móvil y carrito flotante responsive.
20. ✓ Protección de datos personales en APIs públicas (cero filtración de nombres/teléfonos).

### Pruebas en Vivo Realizadas sobre el Servidor
Se levantó el servidor de producción con `npm run start` en el puerto 3000 y se ejecutaron peticiones HTTP reales:
- **`GET /api/settings`:** HTTP 200 con configuración y estadísticas públicas.
- **`GET /api/numbers?limit=3`:** HTTP 200 con paginación e información de estado sin datos personales.
- **`POST /api/admin/auth/login`:** HTTP 200 con credenciales de `yilda`, emitiendo cookie segura con `displayName: "Yilda"`.

---

## 6. Aspectos Legales y Regulatorios (Jujuy / Argentina)

### Análisis de Fuentes Oficiales
1. **Competencia Provincial:** En la República Argentina, los juegos de azar y sorteos no son materia delegada a la Nación (Arts. 121 y 75 inc. 12 de la Constitución Nacional), correspondiendo su regulación exclusiva a cada provincia.
2. **Código Penal Argentino (Art. 301 bis, Ley 27.346):**
   > *"Será reprimido con prisión de tres (3) a seis (6) años el que explotare, administrare, operare o de cualquier manera organizare, por sí o a través de terceros, cualquier modalidad o sistema de captación de juegos de azar sin contar con la autorización pertinente emanada de la autoridad jurisdiccional competente."*
3. **Provincia de Jujuy (Ley Provincial N° 6.114):**
   - El **InProJuy (Instituto Provincial de Juegos de Azar de Jujuy)** es el único organismo competente para autorizar y regular rifas y tómbolas en la provincia.
   - InProJuy exige personería jurídica (asociación civil o fundación), depósito en garantía de los premios y pago de un canon fiscal para emitir una **Resolución Oficial de Autorización**.

### Hechos Verificados y Conclusión Legal
- **La presente rifa NO cuenta con autorización ni resolución de InProJuy.**
- Es una iniciativa **solidaria familiar de carácter privado** organizada por y para el núcleo familiar para el pago de cuotas de un lote.
- **Recomendaciones Imperativas antes de difundir:**
  1. **Ámbito de circulación:** La rifa debe circular exclusivamente por canales privados directos (familiares, amigos, compañeros de trabajo y allegados conocidos). **No debe realizarse publicidad en medios masivos (radio, televisión, diarios) ni anuncios pagos en redes sociales (Meta Ads, Instagram).**
  2. **Transparencia en el sitio:** En el portal público se expresa claramente que se trata de una rifa solidaria familiar privada. **Bajo ninguna circunstancia debe afirmarse que cuenta con aval estatal o autorización de InProJuy sin tenerla.**
  3. **Fecha y premios:** Antes de iniciar la venta masiva, deben definirse los premios y el método de sorteo (por ejemplo: *"Se sorteará por Quiniela de Jujuy Nocturna del día DD/MM/AAAA"* o *"Sorteo en vivo por transmisión familiar"*).

---

## 7. Pasos Manuales Obligatorios antes del Lanzamiento

Antes de recibir compras reales, deben completarse los siguientes pasos:

1. **Establecer Contraseñas Nuevas y Privadas (Modo Interactivo Protegido):**
   Ejecutar desde la terminal del proyecto (no escribir la contraseña en el comando para evitar que quede en el historial de Linux/Windows):
   ```bash
   npm run change-password alan
   ```
   *El sistema solicitará de forma enmascarada con asteriscos (`*`) la nueva contraseña y su confirmación.*
   
   Luego, ejecutar para Yilda (su usuario de acceso es `yilda` y su nombre visible es **Yilda**):
   ```bash
   npm run change-password yilda
   ```
   *El cambio se aplica inmediatamente y queda asentado en la auditoría sin exponer claves.*

2. **Generar el Secreto de Sesión en `.env.local`:**
   Crear o editar `.env.local` y definir un `ADMIN_SECRET_KEY` seguro de al menos 32 caracteres:
   ```bash
   # Generar clave secreta aleatoria:
   node -e "console.log('ADMIN_SECRET_KEY=' + require('crypto').randomBytes(32).toString('hex'))" >> .env.local
   ```

3. **Completar Datos del Sorteo en el Panel Administrativo (`/admin/configuracion`):**
   - Iniciar sesión en `/admin/login` con cualquiera de las dos cuentas.
   - Definir los **Premios**.
   - Definir la **Fecha y Modalidad del Sorteo**.
   - Completar el **Alias Bancario**, **CBU**, **Banco** y **Titular** de la cuenta donde se recibirán las transferencias.
   - Colocar el **Número de Celular con WhatsApp** para la recepción automática de comprobantes.

4. **Definir la Estrategia de Despliegue ($0):**
   - **Opción A (Auto-hospedado con persistencia en `rifa.db` y túnel seguro gratuito):**
     1. Iniciar la aplicación: `npm run build && npm run start`
     2. En otra terminal: `cloudflared tunnel --url http://localhost:3000`
     3. Copiar la URL pública HTTPS de Cloudflare y compartirla en el círculo íntimo familiar.
   - **Opción B (Nube Vercel + Turso LibSQL $0):**
     1. Crear base en Turso: `turso db create rifa-prod`
     2. Volcar la base `rifa.db` a Turso mediante el CLI o dump SQL.
     3. Configurar en Vercel las variables `DATABASE_URL` y `DATABASE_AUTH_TOKEN`.

---

## 8. Certificado de Verificación Técnica

| Componente | Estado | Verificación |
| :--- | :---: | :--- |
| **80.000 Números** | **100% Intactos** | 80.000 registros del 00001 al 80000 en estado `available` en `rifa.db`. |
| **Cuentas Administradoras** | **Verificadas** | Alan (`alan`) e Yilda (`yilda`, nombre visible `Yilda`). |
| **Suite de Pruebas** | **20/20 Aprobadas** | Ejecutadas en sandbox aislado (`backups/test_isolated.db`) sin tocar `rifa.db`. |
| **Compilación de Producción** | **Aprobada (0 Errores)** | Next.js 15.5.28 (`npm run build`), 28/28 rutas dinámicas y estáticas generadas. |
| **Integridad Transaccional** | **ACID Garantizado** | Bloqueo exclusivo contra dobles reservas y reversión en fallos parciales. |
| **Preservación y Backups** | **Comprobada** | Respaldo verificado en `backups/backup_2026-10-15T18-17-13.db` (5.38 MB). |
| **Costo Operativo** | **$0 Estricto** | Cero costo en licencias, APIs pagas, bases de datos o pasarelas. |
