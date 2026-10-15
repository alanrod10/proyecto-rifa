# Manual de Operación para Administradores
## Proyecto RIFA (80.000 Números)

Este manual está diseñado para **Alan** e **Yilda**, administradores del sistema, para guiar la operativa diaria de la rifa familiar desde cualquier celular o computadora.

---

## 1. Acceso al Panel Administrativo

- **Dirección Web:** `http://tu-dominio/admin/login` (o en local `http://localhost:3000/admin/login`).
- **Cuentas Individuales:**
  - **Administrador 1 (Alan):** Usuario `alan` | Contraseña: `Rifa2026!Admin1`
  - **Administradora 2 (Yilda):** Usuario `yilda` | Contraseña: `Rifa2026!Admin2`
- Ambas cuentas tienen permisos completos e independientes. El sistema registra en el historial de auditoría el nombre exacto de quién realizó cada confirmación o cambio.

---

## 2. Flujo de Trabajo Diario

### A. Confirmar un Pago por Transferencia Bancaria
1. Un comprador solicita números desde el portal público y elige «Transferencia». El sistema reserva sus números temporalmente (por 48 hs) en estado **Pendiente**.
2. El comprador te envía el comprobante bancario por WhatsApp.
3. Verificás en tu aplicación del banco o billetera virtual (Mercado Pago, Cuenta DNI, Banco) que el dinero haya ingresado efectivamente.
4. Ingresás al panel en **Solicitudes Web** (`/admin/solicitudes`).
5. Buscás al comprador por su nombre, celular o código de pedido (ej: `RF-A82B`).
6. Presionás el botón verde **Confirmar Pago**.
7. ¡Listo! El pedido pasa a **Pagado**, los números quedan registrados como **Vendidos** de forma permanente y se suma el dinero a la recaudación real del panel.

### B. Registrar una Venta Directa en Mano (Efectivo o Transferencia en Vivo)
Cuando vendés números en persona a un familiar, vecino o amigo cara a cara:
1. Entrás a **Ventas Directas** (`/admin/ventas`).
2. Completás:
   - Nombre y Apellido.
   - Número de Celular.
   - Números deseados (podés escribirlos o presionar `+1 al azar`, `+5 al azar` si no tienen preferencia).
   - Medio de pago: *Efectivo* o *Transferencia*.
   - Estado: Seleccioná **✓ Pagado ahora** si ya te entregó el dinero, o **⏳ Pendiente** si te lo pagará más tarde.
3. Hacés clic en **Confirmar y Guardar Venta**.
4. Podés abrir o copiar el comprobante digital generado y compartírselo por WhatsApp en el momento.

### C. ¿Qué hacer si un comprador perdió su enlace privado?
Los compradores no pueden buscar por celular en la web pública por protección de datos personales.
1. Ingresás a **Compradores** (`/admin/compradores`).
2. Escribís su nombre o celular en el buscador.
3. Al desplegar su registro, verás todos sus pedidos.
4. Presionás el botón verde **Reenviar por WhatsApp** o **Copiar enlace**.
5. Se lo enviás directamente por WhatsApp.

### D. Liberar Reservas Vencidas
El sistema libera automáticamente los números vencidos ante cada interacción pública. Sin embargo, también podés forzar la liberación manual:
1. En el **Resumen** (`/admin`), hacé clic en el botón amarillo **Liberar Vencidos**.
2. El sistema revisará todos los pedidos impagos que hayan superado las 48 hs, devolverá los números al estado *Disponible* y marcará la orden como *Vencida*.

### E. Modificar Premios, Fechas o Alias Bancario
1. Ingresás a **Configuración** (`/admin/configuracion`).
2. Podés modificar:
   - El texto de premios (cuando estén confirmados).
   - La fecha y hora exacta del sorteo.
   - El Alias, CBU o titular bancario.
   - El celular de WhatsApp receptor de consultas.
   - El precio unitario por número (si en el futuro decidieran modificarlo; los números ya vendidos conservarán su precio histórico).
3. Presionás **Guardar Configuración**. El cambio impacta inmediatamente en la portada pública.

### F. Descargar Listados a Excel (CSV)
1. En el **Resumen** o menú de exportación, hacé clic en **Exportar CSV**.
2. Se descargará un archivo `.csv` compatible con Microsoft Excel conteniendo todas las órdenes, compradores, importes y números asignados.

---

## 3. Buenas Prácticas de Seguridad

- **No compartan contraseñas:** Cada uno debe usar su propio usuario para mantener la trazabilidad de auditoría.
- **No confirmen pagos sin verificar el banco:** Jamás marquen un pedido como pagado basándose únicamente en una captura de pantalla de WhatsApp; verifiquen siempre en su cuenta bancaria real que los fondos estén acreditados.
- **Realicen respaldos periódicos:** Al menos una vez por semana o tras jornadas de venta intensa, ejecuten `npm run backup` desde la consola.
