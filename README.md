# Sistema Moe Erp

## Notas de versiones

### 2.0.2 (Versión actual)

- Solución a bugs:
-- Sistema permitía agregar promos express a una venta habiendo otra vacía o sin confirmar.
-- Sistema permitía agregar productos a promos express habiendo otro vacío o sin confirmar.
-- Sistema permitía agregar productos vacíos al modificar promos.
-- Sistema no mostraba alerta por campos obligatorios al modificar promos.
-- Sistema no mostraba alerta por campos obligatorios al modificar productos.

### 2.0.1

- Verificación de nombre existente al agregar productos, para evitar duplicados.
- Verificación de código de barras existente al agregar productos.
- Manejo de errores al agregar productos.
- Solución a bugs:
-- Al agregar una promo, se agregaba duplicada.
-- Sistema mostraba alerta de producto agregado correctamente, a pesar de que no se agregó.
-- Sistema permitía agregar productos vacíos al agregar promos.

### 2.0.0

- Apertura y cierre de caja.
- Asignar cada venta a una caja.
- Obtener todas las cajas de un día específico, con sus respectivas ventas.

### 1.1.2

- Agregado de nuevo sistema de búsqueda a sección de agregar promos.
- Mejoras visuales a sección de lista de promos.
- Agregado de función de modificar promo desde lista de promos.
- Agregado de notas de versiones.

### 1.1.1

- Nuevo sistema de búsqueda por nombre al agregar productos o promos en ventas.
- Notificaciones al guardar o cancelar una venta.
- Manejo de errores de venta a través de notificaciones.

### 1.1.0

- Crear promos express en ventas.
- Crear montos sueltos en ventas.
- Mejoras visuales a sección de lista de productos.

### 1.0.0

- Crear, leer, modificar y eliminar productos.
- Crear, leer y eliminar promos.
- Agregar productos en ventas, por código de barras o buscando por nombre.
- Agregar promos en ventas.
- Crear y leer ventas.
- Obtener ventas de una fecha específica, con su respectivo detalle, y calcular caja sumando los totales de todas las ventas.