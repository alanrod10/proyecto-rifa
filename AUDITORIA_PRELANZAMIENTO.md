# Informe de Auditoría Técnica y de Seguridad Previa al Lanzamiento
## Proyecto RIFA (80.000 Números) — `C:\Proyecto RIFA`
**Última Actualización:** Octubre 2026  
**Estado General:** Aprobado para operaciones con recomendaciones operativas y de seguridad activas.

---

## 1. Resumen Ejecutivo y Preservación de Datos

Se realizó una auditoría técnica integral sobre la arquitectura, el código fuente, la base de datos, la criptografía y las medidas de seguridad del sistema.

### Estado Verificado de la Base de Datos Local
- **Base de datos activa:** `rifa.db` (5.38 MB).
- **Total de registros en `numbers`:** 80.000 números indexados (del `00001` al `80000`).
- **Estado de los números:** 80.000 disponibles (0 vendidos y 0 reservados en la base limpia inicial).
- **Cuentas administrativas registradas en base:**
  - `alan` (Nombre visible: Alan).
  - `yilda` (Nombre visible: Yilda; compatible con identificador histórico `esposa`).
- **Copias de seguridad verificadas en `backups/`:**
  - Archivos SQLite binarios consistentes generados mediante `VACUUM INTO`.
  - Archivos de volcado estructurado JSON con metadatos y conteo íntegro de 80.000 números.

---

## 2. Estado de Despliegue y Repositorio

| Parámetro | Estado Anterior (Histórico) | Estado Actual Comprobado | Evidencia en el Proyecto |
| :--- | :--- | :--- | :--- |
| **Repositorio Git** | Local sin remotos | **Conectado a GitHub** | Remoto `origin` configurado en `https://github.com/alanrod10/proyecto-rifa.git`, rama `main`. |
| **Publicación Web** | No publicado | **Desplegado en Vercel** | Aplicación activa en producción con HTTPS en `https://proyecto-rifa.vercel.app`. |
| **Base de Datos Prod** | Únicamente archivo local | **Preparado para Turso / LibSQL** | Script de migración `scripts/migrate-to-turso.mjs` y cliente `@libsql/client` compatible. |
| **Tema Visual** | Modo oscuro estático | **Tema Claro por defecto + Dark Mode** | `ThemeToggle.tsx`, tokens Tailwind v4 y script anti-flicker en `layout.tsx`. |

---

## 3. Auditoría de Seguridad y Criptografía

### A. Almacenamiento de Contraseñas
- Las contraseñas de los administradores se almacenan exclusivamente mediante hashes criptográficos `bcrypt` con 10 rondas de salting (`$2b$10$...`).
- No existen contraseñas en texto plano en la base de datos ni en el repositorio.
- **Herramientas de cambio seguro de contraseña:**
  1. **Web:** Sección *Seguridad de Mi Cuenta* en `/admin/configuracion`.
  2. **Consola:** Script interactivo `scripts/change-admin-password.mjs` (`npm run change-password <usuario>`) con entrada enmascarada para no dejar registros en el historial del shell (`~/.bash_history` o `ps aux`).

### B. Sesiones Administrativas
- Generadas mediante tokens JWT firmados con el algoritmo HS256 a través de la librería `jose`.
- Almacenadas en cookies `httpOnly`, con directiva `SameSite=Lax` y vigencia de 7 días.
- La firma depende de la variable de entorno `ADMIN_SECRET_KEY` (mínimo 32 caracteres criptográficos).

### C. Rate Limiting contra Ataques de Fuerza Bruta
- El endpoint `/api/admin/auth/login` registra cada intento fallido en `audit_logs` con la acción `ADMIN_LOGIN_FAILED`.
- Si se acumulan más de 5 fallos en una ventana de 10 minutos para una misma IP o cuenta, el servidor responde automáticamente con un código `HTTP 429 Too Many Requests`.

### D. Sanitización contra Inyección de Fórmulas CSV
- En la exportación a hojas de cálculo (`/api/admin/export`), se neutraliza cualquier celda que comience con los caracteres `=`, `+`, `-` o `@`, anteponiendo un apóstrofe (`'`) para evitar la ejecución involuntaria de comandos al abrir el archivo en Microsoft Excel.

### E. Prevención de Pagos Fantasma y Máquina de Estados
- La confirmación de pagos en `/api/admin/orders` exige que la orden se encuentre estrictamente en estado `'pending'` y que los números permanezcan en estado `'reserved'` dentro de la misma transacción de escritura.

---

## 4. Auditoría de la Suite de Pruebas Automatizadas

La suite de pruebas en `scripts/verify-tests.mjs` opera de manera segura sobre una base de datos clonada temporal (`backups/test_isolated.db`) que se destruye al finalizar, preservando la integridad de `rifa.db`.

Se ejecutó la suite completa obteniendo **25 de 25 pruebas aprobadas (0 falladas)**:

1. **✓ Consultar disponibilidad pública:** Validación de 80.000 números indexados.
2. **✓ Seleccionar varios números:** Verificación de estados simultáneos.
3. **✓ Crear solicitud de reserva:** Creación transaccional con comprador y expiración de 48 hs.
4. **✓ Cálculo de importe en backend:** Validación del total (ej. 3 × $100 = $300) sin confiar en el cliente.
5. **✓ Enlace privado por token:** Consulta autorizada mediante token de 192 bits.
6. **✓ Confirmación de pago:** Transición atómica de la orden a `paid` y los números a `sold`.
7. **✓ Registro de venta directa:** Creación presencial con autoría asentada.
8. **✓ Rechazo de números vendidos:** Respuesta `HTTP 409 Conflict` ante números ocupados.
9. **✓ Concurrencia con bloqueo ACID:** Dos operaciones simultáneas sobre el mismo número resultan en exactamente 1 éxito y 1 rechazo.
10. **✓ Prevención de asignaciones parciales:** Reversión completa (`ROLLBACK`) si 1 número de un lote falla.
11. **✓ Expiración automática:** Liberación reactiva de reservas vencidas a `'available'`.
12. **✓ Rechazo de accesos no autorizados al panel:** Tokens falsificados o ausentes son rechazados.
13. **✓ Aislamiento de comprobantes privados:** Intentos de consultar tokens inexistentes retornan HTTP 404 sin exponer datos ajenos.
14. **✓ Validación de permisos de ambos administradores:** Comprobación de roles y display names de Alan e Yilda.
15. **✓ Persistencia de datos:** Verificación de persistencia tras el cierre y reapertura de la conexión.
16. **✓ Exportación CSV compatible con Excel:** Inclusión del BOM UTF-8 y codificación de columnas.
17. **✓ Respaldo y restauración:** Verificación de integridad con 80.000 registros intactos.
18. **✓ Simulación de fallo de red:** Reversión limpia tras interrupción provocada en transacción.
19. **✓ Revisión de diseño móvil y escritorio:** Comprobación de viewport y barra flotante de carrito móvil.
20. **✓ Protección de privacidad en APIs públicas:** Cero filtración de nombres o celulares de compradores en `/api/numbers`.
21. **✓ Prevención de pago fantasma:** Validación estricta de orden `'pending'` y números reservados en `/api/admin/orders`.
22. **✓ Rate Limiting en Login:** Detección de bloqueos HTTP 429 ante reiteración de credenciales inválidas.
23. **✓ Carga de celular directo sin prefijo 54:** Normalización automática de celulares argentinos (+54 9) para enlaces de WhatsApp.
24. **✓ Sanitización CSV y códigos únicos:** Neutralización de fórmulas y comprobación de unicidad en códigos `RF-XXXXXX`.
25. **✓ Optimización Turso y Zona Horaria:** Eliminación de `ORDER BY RANDOM()` en favor de muestreo por clave primaria indexada y zona horaria `America/Argentina/Jujuy`.

---

## 5. Marco Legal y Regulatorio (Provincia de Jujuy / Argentina)

### A. Normativa Aplicable
1. **Constitución Nacional Argentina:** Los juegos de azar y sorteos constituyen una potestad no delegada a la Nación por las provincias (Arts. 121 y 75 inc. 12 C.N.).
2. **Código Penal de la Nación (Art. 301 bis, Ley 27.346):**
   > *"Será reprimido con prisión de tres (3) a seis (6) años el que explotare, administrare, operare o de cualquier manera organizare, por sí o a través de terceros, cualquier modalidad o sistema de captación de juegos de azar sin contar con la autorización pertinente emanada de la autoridad jurisdiccional competente."*
3. **Provincia de Jujuy (Ley Provincial N° 6.114):**
   - El **InProJuy (Instituto Provincial de Juegos de Azar de Jujuy)** es el organismo estatal con competencia exclusiva para regular, fiscalizar y autorizar rifas, tómbolas y sorteos públicos en el territorio provincial.
   - Las autorizaciones oficiales de InProJuy se otorgan formalmente a entidades con personería jurídica acreditada (asociaciones civiles, fundaciones o cooperadoras), con depósito en garantía de los premios ofrecidos y tributación del canon correspondiente.

### B. Situación Real del Proyecto y Directivas de Circulación
- **La presente rifa solidaria NO cuenta con autorización ni resolución de InProJuy.**
- Su naturaleza es estrictamente **familiar, comunitaria y privada**, orientada a reunir fondos para cancelar cuotas de un terreno familiar entre allegados.
- **Directivas Imperativas de Operación:**
  1. **Circulación exclusivamente privada:** La rifa debe difundirse únicamente por canales personales directos (WhatsApp individual o grupos de familiares, vecinos y amigos). **Bajo ninguna circunstancia debe publicitarse en medios de comunicación masivos (radio, televisión, diarios) ni mediante anuncios comerciales pagos en redes sociales (Facebook Ads, Instagram Ads).**
  2. **Transparencia absoluta:** El portal público expresa con claridad que se trata de una rifa solidaria familiar privada. **Está terminantemente prohibido afirmar o insinuar que el evento cuenta con aval estatal, autorización oficial o resolución del InProJuy.**
  3. **Certidumbre del sorteo:** Antes de abrir la venta masiva, deben fijarse con total claridad la fecha del sorteo, los premios y la modalidad de adjudicación (por ejemplo, tomar como referencia la Quiniela de Jujuy Nocturna de una fecha determinada).

---

## 6. Lista de Tareas Operativas Pendientes antes de la Difusión

1. **Establecer contraseñas definitivas:** Cambiar las claves iniciales de `alan` e `yilda` a través del panel de configuración web o con `npm run change-password`.
2. **Definir datos bancarios en el panel:** Ingresar a `/admin/configuracion` y completar el CBU, Alias, Banco y Titular de la cuenta familiar receptora de transferencias.
3. **Definir fecha y premios:** Actualizar en el panel el listado definitivo de premios y la fecha de sorteo.
4. **Verificar recepción de comprobantes:** Comprobar que los números de WhatsApp receptores (Alan `3884152040` e Yilda `3884141514`) reciban adecuadamente los mensajes prearmados desde el portal.
