# Lectura y traducción de tickets: valoración, sin implementación

Revisado el 17/10/2026. Lucio ha pedido analizar estas dos ampliaciones antes de decidir. No se ha ampliado el endpoint de IA, su contrato ni los botones de Gastos o de traducción.

## Viabilidad

Es viable reutilizar la infraestructura de Google ya configurada, su clave privada y la comprobación previa de ausencia de facturación. Gemini 3.5 Flash-Lite admite imágenes y Google lo presenta como apto para traducción y procesamiento de datos. El nivel gratuito tiene límites por proyecto que compartirían las comidas, los gastos normales y las traducciones; la capacidad no está garantizada. No se propone contratar nada ni habilitar facturación.

Fuentes oficiales consultadas:
- https://ai.google.dev/gemini-api/docs/image-understanding
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/rate-limits

## Tickets de gastos normales

Ofrecer un botón opcional Leer con Google junto al OCR local. Proponer establecimiento, fecha, importe y moneda, con revisión antes de guardar. Reutilizar la preparación de fotos y el acceso gratuito, sin enviar cuentas ni el resto del viaje. El contrato actual de Grupo exige euros, conceptos que suman exactamente y un total positivo: no debe aplicarse sin adaptación a facturas extranjeras, abonos, descuentos, propinas o tickets sin desglose. Los campos ausentes o dudosos deben quedar para revisión, sin inventar datos ni reemplazar campos corregidos sin que el usuario lo vea.

## Tickets extranjeros

Pedir en una única lectura texto original, traducción al español por línea e importes/moneda originales. Mantener la fotografía original y generar una vista de la traducción al lado; no redibujar ni modificar la foto. La conversión a euros debe seguir usando los cambios configurados en la app, no un cambio sugerido por el modelo. Revisar monedas sin decimales, separadores numéricos y fechas. Conservar Lens como alternativa manual y OCR local disponible.

## Recomendación

Ampliar primero la extracción opcional en gastos normales y, tras probar tickets reales de distintas monedas, añadir traducción en la misma petición. Mantener revisión humana, consentimiento para enviar las fotos, credenciales privadas, bloqueo ante cuota agotada, error de verificación o facturación vinculada, sin reintentos ni paso a pago. Más usos consumirían la misma cuota gratuita disponible. La precisión observada en comidas es prometedora, pero no garantiza todos los formatos o idiomas. Si Google cambia la oferta gratuita, no se debe habilitar ningún sustituto de pago.

## Decisión y entrega 800v017

Lucio autorizó la implementación: modo opcional de Gemini en gastos normales y traducción, conservando Lens y OCR local. Solo emisor y total, moneda original, traducción aparte y revisión explícita. Cuotas verificadas el 17/10/2026 en AI Studio: 500 solicitudes/día, 15/minuto y 250.000 tokens de entrada/minuto. El registro compartido de la app comienza en esta versión y no equivale al consumo oficial completo; Google no proporciona ese saldo en generateContent. Se conserva el bloqueo de pago y la protección propia existente de Netlify.
