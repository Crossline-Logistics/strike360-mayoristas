# Strike 360 — landing mayoristas

Landing estática para que casas de deportes y jugueterías pidan vender Strike 360.
Un solo `index.html` más imágenes y fuentes; sin build. El formulario de contacto abre WhatsApp.

- Diseño: exportado desde Claude Design.
- Hosting: Netlify (`netlify.toml` incluido). Destino: `mayoristas.strike360.com.ar`.
- Para ver en local: servir la carpeta con cualquier servidor estático (`npx serve .`).

## Qué se retoca después de cada export

El export de Claude Design no se sube tal cual. Sobre el `.dc.html` que sale del zip:

1. Se le agrega `lang="es-AR"` y el `<title>`, y se apunta `support.js` sin el `./`.
2. Las fuentes se sirven desde `fonts/` en vez de Google Fonts: se reemplaza el `<link>` a
   `fonts.googleapis.com` por el bloque `<style>` de `@font-face` que ya está en `index.html`.
3. Las imágenes van a **WebP** en `assets/` (el export las trae en JPG/PNG sin optimizar, ~7,8 MB;
   en WebP son ~960 KB). Se redimensionan al doble del tamaño en que se muestran y se convierten
   con `cwebp`: `-q 93` para los diagramas de medidas (tienen texto fino), `-q 82` para las fotos,
   `-lossless` para el logo. Después hay que cambiar las extensiones en el HTML.
4. Del zip sólo se copian los assets que el HTML referencia; `uploads/`, `scraps/` y las variantes
   sin usar quedan afuera.
5. Al final del `<style>` del `helmet` hay dos media queries agregadas a mano para mobile
   (el menú del header y el tamaño del titular). Están comentadas en el archivo.

Los arreglos de **texto** conviene hacerlos en Claude Design y re-exportar, no acá, porque el
próximo export los pisa.
