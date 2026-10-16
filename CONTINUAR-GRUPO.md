# Continuar «Grupo → Comidas» desde el proyecto local

Estado: trabajo inicial, sin interfaz conectada ni cambios en producción.

Carpeta indicada por Lucio: `C:\Users\lucio\Documents\Codex\Cuaderno de Bitacora`.
Repositorio: `luciojmartinez-lab/gastosdeviaje`.
Base consultada: `fa553a7041b2a7aafed66ee8aecb98ba9dd4a802` (800v001, 13/10/2026).
Rama de continuación: `feature/grupo-comidas`.

## Primera acción en escritorio

Leer AGENTS.md/instrucciones locales, revisar `git status` y comparar la versión local con esta base antes de integrar nada. Conservar los cambios locales de Lucio. No reemplazar la carpeta ni cambiar de rama con modificaciones pendientes sin preservarlas. La sesión anterior estaba en nube y no pudo leer la unidad C:.

## Objetivo autorizado

Integrar una sección Grupo en Cuaderno de Bitácora. Prioridad: viaje de 12 atletas a Tenerife, sin fondo común. Lista de viajeros por viaje; asistentes por comida; foto de ticket; revisión de conceptos, cantidades, importes y total; asignación por personas/unidades; pan y agua compartidos por defecto entre asistentes, editable; reparto exacto en céntimos; quién paga y devoluciones parciales; resumen compartible. Una persona administra desde su móvil; no requiere instalar la app a los doce. Coste cero, aprovechar OCR local existente.

Futuro, fuera de esta primera entrega: fondo común con aportaciones y devolución del sobrante; liquidación general entre viajeros; edición simultánea desde varios móviles.

## Trabajo iniciado

- `group-meals.js`: lógica independiente, expuesta como `TravelGroup`. Modelo de grupo, reparto en céntimos, reparto por pesos/unidades, validación de comidas cerradas y cobros, balances, propuesta de extracción de líneas OCR, resumen en texto y remapeo de cuentas para importaciones.
- `group-ledger.js`: `TravelGroupLedger.plan`, propuesta de operaciones para integrar consumo personal y pagos con las cuentas actuales, sin duplicar gastos. Todavía no se ejecuta en la aplicación.
- `tests/group-meals.test.js`: pruebas de la lógica inicial. No sustituye las pruebas de integración pendientes.

Los módulos aún no están cargados en index.html. No hay cambios en app.bundle.js, esquema IndexedDB, CSS, service worker ni versión de la aplicación.

## Diseño contable propuesto

Viajeros y movimientos del grupo viven en `viaje.group`, por lo que pueden viajar en las copias existentes. Usar IDs de texto estables para viajeros, comidas, conceptos y cobros, y una revisión para conflictos.

Distinguir siempre consumo, adelantos y devoluciones. Una cuenta de compensación EUR del viaje (`groupClearing: true`) refleja positivo a recuperar y negativo a pagar:

- Si Lucio paga 300 y consume 25: gasto personal 25 en la cuenta de compensación + transferencia 300 desde la cuenta real a compensación. Banco -300, pendiente +275; gasto personal 25.
- Las devoluciones recibidas transfieren compensación → cuenta real y no son otro gasto/ingreso de consumo.
- Si otro paga: consumo propio en compensación; al devolverle su parte, transferencia cuenta real → compensación.

La función plan revierte los efectos previos de los movimientos de ese grupo y prepara los nuevos; conserva IDs por `groupSource` y marca los registros con `groupTripId`. Hay que ejecutar el conjunto en UNA transacción IndexedDB (viajes, cuentas, gastos, transferencias, categorías), comprobando revisión vigente para no perder cambios de otra pestaña. Los movimientos generados deben editarse desde Grupo; impedir edición/borrado independientes que desajusten el conjunto.

## Pendiente de implementar y verificar

1. Comparar copia local y rama; revisar modelo inicial y sus límites antes de utilizarlo.
2. Interfaz responsive de viajeros (alta múltiple por líneas, editar/archivar), identidad propia e integración personal opcional.
3. Editor de comida con asistentes, conceptos, asignación por pesos/unidades, compartidos, foto, entrada manual y OCR `recognizeTicket` de `ticket-ocr.js`; revisión obligatoria. No inventar importes ante OCR dudoso. La extracción de líneas iniciada es conservadora y necesita tickets reales.
4. Guardado de borrador y cierre solo cuando todo cuadre; no borrar/asignar ausentes de manera silenciosa; manejar modificación con cobros existentes y devoluciones/rectificaciones.
5. Registro de quién pagó y cobros parciales, consulta de pendientes y resumen compartible.
6. Persistencia atómica y control de conflictos. Cargar y renderizar Grupo desde app.bundle.js sin bloquear viajes individuales.
7. Copias completas y por viaje: validar/remapear `viaje.group.meals[].accountId` y `settlements[].accountId` usando accountMap en importTripBackup. Remapear también groupTripId en los gastos y transferencias generados al importar sobre otro viaje. Evitar duplicados por doble pulsación o reintentos.
8. Revisar sincronización: adjuntos de tickets dentro de viajes pueden necesitar incorporarse al empaquetado/fragmentación actual. No asumir que solo por guardar en viaje se resuelven los adjuntos grandes.
9. Nuevos scripts en index, caché requerida/core de sw.js, navegación y estilos. Nueva versión según norma local, ayuda, pruebas y comprobación móvil.
10. Ejecutar pruebas existentes y nuevas; probar el circuito de una comida de doce, foto real, unidades, ausentes, céntimos, cobros parciales, cierre, edición, recarga, copias/importaciones, navegación y modo sin conexión.

La copia de trabajo en nube descargó solo archivos de texto del repositorio. La ejecución inicial de la suite completa tuvo fallos por imágenes/PDF ausentes en ese entorno; no interpretar esas ausencias como cambios necesarios al repositorio.

No se ha desplegado ni modificado main. Continuar en rama de desarrollo y no publicar sin verificar el resultado.
