# Activar la lectura gratuita de tickets

Estado a 16/10/2026: Google y Netlify configurados en modo free-only. El proyecto de la clave y la ausencia de facturación se han comprobado con llamadas reales. El código de acceso incorrecto devuelve 401. Gemini ha respondido temporalmente 503 por alta demanda: la lectura de la foto real todavía no se ha podido validar. La aplicación informa de saturación sin cambiar de proveedor ni reintentar automáticamente. El código de uso se conserva localmente en .netlify/receipt-access.txt, ignorado por Git; no es la clave privada de Google.

## Condición de Lucio: coste cero

Usar un proyecto dedicado de Google AI Studio en nivel **Free**, sin ninguna cuenta de facturación vinculada. No activar pruebas con créditos, planes de pago, recargas ni tarjetas. El modelo fijo es `gemini-3.5-flash-lite`, con entrada de imagen y salida de texto gratuitas a fecha de 16/10/2026. Las cuotas pueden cambiar y no se promete disponibilidad ilimitada.

Antes de cada imagen, la función consulta el proyecto propietario de la clave y el estado de facturación de ese mismo proyecto. Si hay una cuenta vinculada, falta un permiso, la respuesta es desconocida o la cuota se agota, se bloquea. No hay cambio de modelo, reintento automático ni proveedor de pago. Estas comprobaciones no sustituyen mantener el proyecto sin facturación: un administrador podría modificarlo fuera de la aplicación. También hay que comprobar que el equipo de Netlify conserve su plan gratuito sin recarga automática; la aplicación usa sus cuotas de funciones y Blobs.

## 1. Proyecto y clave de Gemini

En [Google AI Studio](https://aistudio.google.com/projects), crear un proyecto dedicado: **Bitacora Tickets Gratis**. Ya se ha iniciado este paso en la cuenta de Lucio. Revisar que figure como Free y sin facturación. Si Google exige condiciones legales o crear credenciales, completar ese paso con Lucio.

Crear una clave de API del mismo proyecto y restringirla a **Generative Language API**. Guardarla directamente en la variable privada de Netlify `RECEIPT_GEMINI_API_KEY`, contexto Production y con Functions incluido en sus ámbitos. Si el plan gratuito no permite limitar ámbitos, mantenerla como secreto solo de Production, sin ampliar el plan. No introducirla en la página de Comidas, el repositorio, archivos publicados, una captura o este chat. Conservar el número numérico del proyecto para `RECEIPT_GOOGLE_PROJECT_NUMBER`.

## 2. Verificador de solo lectura

En ese proyecto, habilitar **API Keys API** y **Cloud Billing API** para las consultas de verificación. Esto no requiere asociar una cuenta de facturación: si Google lo exigiera, detener la activación.

Crear una cuenta de servicio dedicada al verificador. Concederle un rol personalizado en ese proyecto con únicamente:

- `apikeys.keys.lookup`
- `resourcemanager.projects.get`

No conceder Owner, Editor ni permisos para modificar facturación. La función solicita los ámbitos OAuth de solo lectura `cloud-platform.read-only` y `cloud-billing.readonly`. Crear su clave JSON con autorización de Lucio y guardarla fuera de la carpeta publicada y del repositorio.

## 3. Credencial privada en Netlify Blobs

El JSON completo no se añade a variables de entorno: el conjunto de variables de Functions tiene un límite reducido. Usar el almacén **privado** `travel-ai-private`, clave `google-free-checker`. No hay un endpoint público para subir o descargar esta credencial y la sincronización de viajes usa un almacén distinto.

Con la CLI oficial de Netlify ya autenticada y vinculada al sitio correcto, comprobar primero `netlify status` y después ejecutar, sustituyendo solo la ruta del fichero privado:

```powershell
netlify blobs:set travel-ai-private google-free-checker --input "C:\ruta-privada\verificador.json"
```

No usar `--debug`, no imprimir el Blob y no subirlo como archivo estático. Los almacenes del sitio se comparten con las vistas previas; limitar también quién puede desplegar funciones en el sitio. Tras la carga, custodiar o retirar de forma segura el fichero de descarga. La clave puede revocarse desde Google Cloud.

## 4. Variables de Functions, solo Production

| Variable | Contenido |
| --- | --- |
| `RECEIPT_GEMINI_API_KEY` | Clave privada de Gemini del proyecto gratuito |
| `RECEIPT_GOOGLE_PROJECT_NUMBER` | Número del mismo proyecto, solo dígitos |
| `RECEIPT_ACCESS_SHA256` | SHA-256 hexadecimal de un código de acceso independiente |
| `RECEIPT_AI_ENABLED` | `free-only`, configurar al final |

Elegir un código de acceso largo y distinto de la clave de Google. Compartirlo solo con los usuarios autorizados. Se introduce en Comidas y permanece en memoria de esa pestaña; no se incluye en borradores ni copias. En Netlify se almacena únicamente su hash. No poner los valores en `netlify.toml` ni en el historial del terminal. Tras cambiar variables, volver a desplegar para aplicarlas.

Para desactivar, quitar `RECEIPT_AI_ENABLED` y desplegar de nuevo. Revocar las claves en Google impide inmediatamente nuevas lecturas aunque quede una versión antigua desplegada. No modificar ni eliminar las copias de viajes.

## 5. Verificación final pendiente

1. Confirmar visualmente Free, ausencia de cuenta de facturación y plan gratuito de Netlify sin recarga.
2. Probar un código incorrecto: debe rechazarse sin enviar la foto a Google.
3. Probar el ticket autorizado de A la Fresca: siete líneas, total 75,90 €. Revisar los resultados reales; las pruebas con respuestas simuladas no garantizan la precisión del modelo.
4. Comprobar el consentimiento por foto, el tiempo de lectura y la apertura del texto reconocido. No guardar una comida sin revisar conceptos, total y reparto.
5. Probar desde PC y móvil. Si el servicio gratuito no está disponible, debe informar y conservar los conceptos. El OCR local sigue siendo una alternativa explícita.

La función solo transmite la imagen a Gemini después de las comprobaciones. No transmite la lista de viajeros ni sus cuentas, no guarda la foto en el servidor de IA y no registra claves o respuestas del proveedor. Google aplica sus propias condiciones y tratamiento de datos al nivel gratuito; el usuario lo ve antes de autorizar cada foto.

Referencias oficiales: [precios](https://ai.google.dev/gemini-api/docs/pricing), [facturación](https://ai.google.dev/gemini-api/docs/billing), [lookupKey](https://docs.cloud.google.com/api-keys/docs/reference/rest/v2/keys/lookupKey), [getBillingInfo](https://docs.cloud.google.com/billing/docs/reference/rest/v1/projects/getBillingInfo), [Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/), [CLI Blobs](https://cli.netlify.com/commands/blobs/).
