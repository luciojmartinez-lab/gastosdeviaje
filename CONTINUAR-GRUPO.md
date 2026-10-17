# Continuar «Grupo → Comidas» desde el proyecto local

Estado actualizado a 16/10/2026: Grupo → Comidas integrado en main mediante la PR #7 y publicado. Numeración corregida a 800v002 por petición de Lucio; sustituye la etiqueta 900v002 sin cambios funcionales. Continuar la serie 800.

## Continuación realizada en escritorio

- Se comparó la carpeta local antes de integrar: main limpio en fa553a7, igual a origin/main. La rama remota añadía únicamente este documento, los dos módulos iniciales y sus pruebas. Se creó `backup/local-antes-grupo-20261016` y se conservaron los archivos locales ignorados.
- Navegación Grupo; viajeros por viaje, altas por líneas, edición y archivo; identidad e integración personal opcional.
- Editor de comidas con asistentes, foto, OCR local existente y texto pegado, conceptos por pesos/unidades, pan/agua compartidos, revisión obligatoria, borrador y cierre. Recuperación local del editor y revisión ante conflictos.
- Pagador único, devoluciones parciales, anulación con motivo e historial, pendientes y resumen compartible. Las anulaciones se excluyen también del pendiente por comida.
- `group-store.js`: transacción IndexedDB única con control de revisión, reversión y regeneración idempotente de gastos/transferencias. Integración solo con cuentas EUR del viaje. Movimientos generados protegidos frente a edición independiente.
- Copias completas y por viaje con validación previa, remapeo de cuentas y groupTripId. Fotos de grupo incorporadas al empaquetado e hidratación de adjuntos de sincronización. Scripts incorporados a la caché offline y ayuda HTML actualizada.
- 298 pruebas automáticas pasan: incluye reparto exacto, doce asistentes, céntimos grandes, ausentes, cierre con revisión obligatoria, pagos parciales/anulados, aborto atómico, concurrencia, importación/remapeo y fotos en copias. Las pruebas de interfaz usan JSDOM y sustituyen la lectura de la foto/OCR; no prueban reconocimiento real.
- Prueba anterior en navegador: comida de 300 EUR entre doce (25 EUR por persona), devolución parcial de 10 y pendiente del pagador 265. Después se restringió la selección de cuentas a las del propio viaje; esa corrección está cubierta por pruebas automáticas.

## Verificación manual pendiente antes de publicar

La herramienta de control del navegador se bloqueó repetidamente al seleccionar un JSON para importar en localhost:8932; no llegó a mostrar una confirmación JavaScript controlable. Lucio canceló un aviso de guardar contraseña, pero al repetir la selección de archivo volvió el bloqueo. No se ha probado de extremo a extremo una foto real/OCR, ni completado la revisión móvil, la recarga y el circuito offline de esta versión final. No confundir este bloqueo de automatización con un diagnóstico confirmado de fallo de importación de la app.

Continuar esas comprobaciones desde una pestaña que responda. Usar datos sintéticos y una cuenta EUR del viaje; banco inicial 500, pago 300, consumo propio 25: banco 200 y compensación 275. Tras recibir 10: banco 210 y compensación 265. Anular esos 10 debe restaurar 200/275 y el pendiente del compañero.

El PDF de ayuda existente no se ha regenerado. Límites de esta entrega: EUR, un pagador por comida, sin fondo común ni edición simultánea entre dispositivos.

## Especificación inicial conservada (histórica)

Los apartados siguientes describen el punto de partida y el diseño acordado; las afirmaciones sobre módulos todavía no conectados corresponden al estado inicial, superado por el trabajo anterior.

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

Actualización 800v003: la selección de foto en Grupo conserva el selector, muestra nombre e imagen directamente y avisa durante la carga; fallos de lectura permiten reintentar sin perder la foto previa. Pruebas con File y FileReader, guardado/reapertura y error/reintento añadidas.

Actualización 800v004: se amplía la detección del papel bajo luz cálida para no recortar la columna de precios. Grupo solicita lectura específica de columnas; solo propone su unión si cantidades de filas y suma coinciden con el total. Se prioriza el total con impuestos sobre la base/cuota. Foto 63077.jpg probada localmente con Tesseract español, preprocesado real y copia recomprimida: siete líneas, 75,90 EUR. La foto privada y los resultados experimentales permanecen en rutas ignoradas; no se publican. 306 pruebas automáticas correctas.

Actualización 800v005: se impide pasar sin corregir a conceptos el texto que el OCR ya había rechazado por falta de emparejamiento. Esta protección persiste en borradores. Las propuestas incompletas que no suman el total tampoco sustituyen los conceptos anteriores. El recorte de nombres empieza debajo de la separación del encabezado; no se descartan filas de letras desconocidas para forzar la unión de columnas y se exige confianza por fila (o corroboración del mismo nombre repetido). Comprobada la foto recomprimida localmente: siete líneas, mejillones 10,50, sepia 12,70 y total 75,90. 309 pruebas pasan.

Actualización 800v006: avisos junto a Proponer conceptos y confirmación de sustitución integrada en la pantalla. Compartir plato entre personas incorpora checks por consumidor y partes ajustables; una unidad puede repartirse entre varias personas sin exigir que las partes sumen las unidades del ticket. Contador de tiempo y progreso de OCR por fases, apertura automática del texto al terminar y recuperación de botones tras errores. 314 pruebas correctas; caso comprobado: una tapa de 10,50 entre tres, 3,50 por persona.


Actualización 800v007: lectura opcional con Gemini gratuita, inicialmente desactivada. Antes de enviar una foto comprueba que la clave pertenece al proyecto configurado y que este no tiene facturación vinculada; cualquier fallo o cuota agotada detiene la lectura sin reintentos ni cambio a pago. Credenciales privadas en Functions/Blobs, consentimiento por foto, código independiente, progreso y revisión obligatoria. No se guardan claves en los borradores. Las funciones quedan fuera de la caché. Activación y prueba real pendientes: ver ACTIVAR-IA-GRATUITA.md. No confundir las pruebas simuladas con una lectura real de Google.


Actualización 800v008: Google y Netlify configurados sin facturación vinculada y con código de acceso independiente. Verificador limitado a apikeys.keys.lookup y resourcemanager.projects.get. Consulta real de proyecto y facturación: ambas correctas. Gemini ha respondido 503 por saturación; se distingue ese aviso de los errores de verificación y no se reintenta ni cambia de proveedor. Prueba real de reconocimiento pendiente de disponibilidad de Google; no afirmar precisión validada por las pruebas simuladas.

Actualización 800v009: se corrige el rechazo INVALID_ARGUMENT del esquema de respuesta de Gemini usando modo JSON con contrato explícito en las instrucciones y validación independiente de conceptos, cantidades e importes. Prueba real con Google y el ticket autorizado: siete productos, importes 10,50 + 12,70 + 33,90 + 3,40 + 5,40 + 5,00 + 5,00 = 75,90 EUR. Sin cuenta de facturación vinculada; no hay reintentos ni cambio a pago. Las cuotas y saturación del proveedor gratuito pueden impedir una lectura. No se incluyen credenciales ni fotos privadas en el repositorio.

Actualización 800v010: las propuestas OCR/IA separan automáticamente las cantidades enteras en platos individuales (dos unidades producen dos conceptos iguales con asignación independiente), sin perder céntimos. Reparto único por comensales marcados, con partes opcionales; se retiran los selectores de compartir/unidades. Las comidas existentes conservan sus asignaciones; se pueden desglosar manualmente líneas agrupadas. Código de IA recordado solo en ese navegador tras una lectura correcta, editable u olvidable; nunca en copias ni en el código público. Las credenciales de Google siguen privadas y el bloqueo de pago permanece.

Actualización 800v011: ojo junto al código de IA para mostrarlo u ocultarlo, con etiqueta accesible y estado del botón. Se oculta al abrir el editor, cambiar el código o recordarlo. Se conserva el mismo valor y no cambia el guardado local ni el acceso gratuito.
