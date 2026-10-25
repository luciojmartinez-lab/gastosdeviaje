# Ayuda y publicación

- Petición permanente de Lucio: después de cualquier modificación de la aplicación, actualizar `ayuda.html` y regenerar `output/pdf/ayuda-cuaderno-bitacora.pdf` antes de publicar.
- Ejecutar `npm run help:pdf` después de terminar los cambios de código, ayuda y versión; después ejecutar `npm test` y revisar visualmente el PDF. La prueba de sincronía comprueba el contenido fuente y el PDF mediante sus huellas. No actualizar el manifiesto manualmente para saltarse la regeneración.
- El generador usa Node/JSDOM y Python con ReportLab. Detecta el Python del runtime de Codex en Windows; fuera de él usar `BITACORA_PYTHON` o `python` con ReportLab instalado. No requiere servicios de pago.
- Mantener la misma versión y fecha en aplicación, ayuda y PDF. La actualización de notas de validación en `CONTINUAR-GRUPO.md` no es una modificación funcional y no requiere otra regeneración.
