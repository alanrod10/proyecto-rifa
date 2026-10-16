# Sistema de Diseño Visual — Proyecto RIFA

## 1. Visión General

El sistema visual de **Proyecto RIFA** está construido sobre **Tailwind CSS v4** integrado con **Next.js 15 (App Router)** y la librería de iconos **Lucide React**. Ofrece una experiencia pulida, moderna y accesible tanto en dispositivos móviles como en pantallas de escritorio, con soporte bidireccional para **Modo Claro (Light Mode, predeterminado)** y **Modo Oscuro (Dark Mode)**.

---

## 2. Arquitectura de Temas (Dark & Light Mode)

### A. Control del Tema
- **Tema predeterminado:** Claro (`data-theme="light"`).
- **Atributo raíz:** Se controla mediante el atributo `data-theme` en la etiqueta `<html>`.
- **Selector de Apariencia:** Componente reactivo [`ThemeToggle.tsx`](src/components/ThemeToggle.tsx) ubicado en la barra de navegación pública y paneles administrativos.
- **Persistencia:** La preferencia del usuario se almacena en `localStorage` bajo la clave `rifa-theme`.
- **Prevención de Parpadeo (Zero-FOG / Anti-Flicker):** Un script en línea ligero inyectado en el `<head>` de [`src/app/layout.tsx`](src/app/layout.tsx) lee `localStorage` antes de la hidratación y aplica el atributo `data-theme` inmediatamente, eliminando cualquier destello visual durante la carga inicial.

### B. Transiciones Suaves
Al alternar el modo, se inyecta temporalmente la clase `.theme-transition` para animar las propiedades de color y fondo durante 350 ms:

```css
html.theme-transition,
html.theme-transition *,
html.theme-transition *::before,
html.theme-transition *::after {
  transition: background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              color 0.25s ease-out,
              box-shadow 0.3s ease-out !important;
}
```

---

## 3. Tokens Semánticos y Paleta de Colores

Los estilos están centralizados en [`src/app/globals.css`](src/app/globals.css) utilizando directivas nativas `@theme` de Tailwind CSS v4.

### A. Paleta Semántica Comparativa

| Token Semántico | Modo Claro (Default) | Modo Oscuro | Uso Principal |
| :--- | :--- | :--- | :--- |
| `--background` | `#f1f5f9` (Slate 100) | `#0b1220` (Night 950) | Fondo general de la página |
| `--background-alt` | `#e8eef6` | `#101b2d` (Night 900) | Fondos alternos o secundarios |
| `--surface` | `#ffffff` | `#152238` | Fondo de tarjetas, modales y tablas |
| `--surface-elevated`| `#ffffff` | `#1a2b47` | Elementos flotantes y desplegables |
| `--text-primary` | `#0f172a` (Slate 900) | `#f1f5f9` (Slate 100) | Títulos y texto de alto contraste |
| `--text-secondary` | `#475569` (Slate 600) | `#94a3b8` (Slate 400) | Párrafos descriptivos y metadatos |
| `--text-disabled` | `#94a3b8` | `#64748b` | Textos inactivos o marcadores de posición |
| `--border-subtle` | `#dbe3ee` | `#223554` | Delimitadores de tarjetas e inputs |
| `--shadow-rgb` | `15 23 42` | `0 0 0` | Canal RGB base para cálculo de sombras |

### B. Colores de Estado del Sorteo

- **Disponible (`available`):** Tonos neutros con bordes definidos y acentos de hover en azul eléctrico (`brand-500`).
- **Seleccionado en Carrito:** Acento azul intenso con borde de alto contraste y check visual.
- **Reservado / Pendiente (`reserved`):** Terracota y ámbar cálido (`#d97706` / `#b45309`), diferenciándolo claramente de un estado pagado o de error.
- **Pagado / Vendido (`sold`):** Verde esmeralda (`#059669` / `#10b981`), comunicando éxito y recaudación firme.
- **Acción Destructiva / Cancelado (`cancelled` / `expired`):** Rojo controlado (`#dc2626`), reservado para eliminaciones y cancelaciones.

---

## 4. Tipografía

El sistema tipográfico combina dos familias tipográficas cargadas a través de `next/font/google` para máximo rendimiento y cero peticiones externas no cacheadas:

1. **Tipografía Principal (Sans-Serif):** `Inter`
   - Variable CSS: `--font-inter`
   - Configuración: `--font-sans: var(--font-inter), system-ui, -apple-system, sans-serif;`
   - Uso: Interfaz general, títulos, textos informativos, botones e indicadores.

2. **Tipografía Numérica (Monospaced):** `JetBrains Mono`
   - Variable CSS: `--font-jetbrains`
   - Configuración: `--font-mono: var(--font-jetbrains), ui-monospace, monospace;`
   - Uso: Números de boletos de 5 dígitos (ej. `00001`, `15420`), códigos de orden (`RF-XXXXXX`), tokens criptográficos y montos monetarios. Permite alineación tabular perfecta.

---

## 5. Bordes Redondeados y Elevación (Radii & Shadows)

### A. Escala de Radios
- `rounded-lg`: `0.625rem` (10px) — Botones compactos, badges e inputs internos.
- `rounded-xl`: `0.875rem` (14px) — Botones principales, selector de números y celdas interactivas.
- `rounded-2xl`: `1.125rem` (18px) — Tarjetas de contenido, paneles del dashboard y modales.
- `rounded-3xl`: `1.375rem` (22px) — Contenedores envolventes y encabezados destacados.

### B. Sombras Dinámicas y en Capas
Las sombras se adaptan en intensidad y transparencia al color de fondo activo:
- `shadow-sm`: Elevación mínima para botones sutiles.
- `shadow-md`: Tarjetas y elementos navegables.
- `shadow-lg` y `shadow-xl`: Carrito flotante inferior y modales de confirmación.
- `shadow-2xl`: Diálogos modales superpuestos y menús contextuales.

---

## 6. Micro-Animaciones y Dinamismo

El archivo `globals.css` define animaciones aceleradas por hardware para brindar fluidez sin sobrecargar dispositivos móviles económicos:

- **`animate-fade-in` (`fade-in 0.35s`):** Entrada suave de vistas y cambios de estado.
- **`animate-slide-up` (`slide-up 0.4s`):** Aparición del carrito móvil fijado al pie de página.
- **`animate-pop` (`pop 0.28s`):** Transición de iconos en el selector de tema y checks de selección.
- **`animate-cell` (`cell-in 0.3s`):** Animación de celdas al paginar la cuadrícula de números.
- **`animate-pulse-subtle`:** Pulso suave en badges de alerta o avisos de reservas próximas a vencer.

---

## 7. Responsividad y Mobile-First

- **Vista Móvil (< 768px):**
  - Barra de resumen de selección fijada en la parte inferior (`fixed bottom-0 left-0 right-0`).
  - Botones de acceso táctil amplio (mínimo 44x44 px de área táctil).
  - Paginador compacto con buscador accesible.
  - Modales optimizados tipo hoja inferior o diálogo centrado con scroll independiente.
- **Vista Escritorio (>= 768px):**
  - Grillas de números tabulares en múltiplos balanceados.
  - Vistas divididas en paneles de administración para visualización de métricas y tablas de auditoría completas.
