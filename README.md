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
5. Al final del `<style>` del `helmet` hay un bloque de ajustes de mobile agregado a mano,
   comentado regla por regla: menú del header, alto y encuadre del hero, capa de contraste
   sobre la foto, alto de las tarjetas, alineación de los números de respaldo, `box-sizing`
   de los campos del formulario y tamaño del titular. Se apoyan en cinco clases
   (`hero`, `hero-inner`, `hero-sub`, `card-why`, `stat`) que también se agregan a mano
   sobre el markup del export — el runtime de Claude Design las respeta.

6. Hay que volver a poner en el `<head>`, al lado del `<script>` de `support.js`:

   ```html
   <link rel="icon" href="favicon.ico" sizes="any">
   <link rel="icon" type="image/png" href="favicon-32.png" sizes="32x32">
   <link rel="apple-touch-icon" href="apple-touch-icon.png">
   <script src="pixel.js"></script>
   <script src="lead.js"></script>
   ```

   El tracking de Meta y el envío del lead viven en esos dos archivos justamente para que un
   export nuevo no se los lleve puestos: adentro de ellos no hay que tocar nada. Los iconos
   tampoco se regeneran, ya están en el repo.

Los arreglos de **texto** conviene hacerlos en Claude Design y re-exportar, no acá, porque el
próximo export los pisa.

## Tracking

Meta Pixel `363383224585035` ("Píxel de Strike 360 - Oficial"), el de la cuenta de Strike, no
uno propio de la landing: los datos caen en el mismo lugar que los de Tienda Nube.

| Evento | Cuándo |
|---|---|
| `PageView` | Al cargar |
| `Lead` | Envío del formulario que pasa la validación; lleva el rubro en `content_category` |
| `Contact` | Click en el mail mayorista (y en un enlace a WhatsApp, si alguna vez se agrega uno suelto) |
| `ClickCTA` | Click en los tres botones que bajan al formulario. Evento propio, no es conversión |
| `FormularioIncompleto` | Alguien apretó "Enviar por WhatsApp" y la página lo frenó. Evento propio, no es conversión: en `content_name` van los campos que faltaban, para ver si hay uno que traba a la gente. Se manda **una sola vez por carga de página**, con el primer tropiezo, así el que insiste cinco veces no infla el número |

Los eventos se enganchan por delegación en `document` porque la página la renderiza React
después de cargar. El `Lead` repite la validación del formulario (comercio, rubro y ciudad;
el mail es opcional) para no contar envíos que la página rechaza.


## El lead a n8n y los UTM hasta Kommo

`lead.js` manda cada formulario al webhook de n8n
(`https://webhook.crossline-logistics.com/webhook/strike-mayoristas-lead`), al workflow
**`[Strike] Landing mayoristas → Kommo (UTM)`** del n8n de Crossline. `TOKEN` viaja en el cuerpo
para que n8n descarte ruido; no es seguridad, cualquiera que abra el archivo lo ve.

Cómo está pensado, según lo que decidió Valentín el 22/09:

- El formulario **sigue abriendo WhatsApp igual**. `lead.js` no lo reemplaza: escucha el envío y
  manda una copia por atrás.
- Si el webhook está caído o rechaza el pedido, **la persona no se entera y llega a WhatsApp
  lo mismo**. Se prefiere perder el registro antes que el contacto.
- Queda de un solo paso: son cuatro campos y tres obligatorios.

**Por qué hay un código en el mensaje de WhatsApp (24/09).** La charla con el comercio pasa en
WhatsApp, y el lead de Kommo que después se marca como vendido es el de ese chat, con el
teléfono. Para que los UTM terminen en ese lead, cada envío genera un código corto
(`ref. M-7K2QX`) que va a n8n con los UTM **y** al final del mensaje de WhatsApp. Cuando el
mensaje entra a Kommo, Kommo le avisa a n8n; n8n encuentra el código y le carga a ese lead los
UTM, el `fbclid`, Rubro, Localidad, "Marca de origen: Strike 360", la etiqueta
`landing-mayoristas` y una nota con los datos del formulario. Cada código se usa una sola vez.

El código se agrega al mensaje interceptando `window.open` desde `lead.js`, para no tocar el
componente del `index.html` (que cada export pisa). Si un export cambia cómo se abre WhatsApp
(otro dominio que `wa.me`, o sin `window.open`), el código deja de agregarse: probarlo después
de cada export.

Los UTM se leen de la URL al entrar y se guardan en `sessionStorage`, así sobreviven aunque la
URL cambie antes de que la persona llene el formulario. Se mandan también `_fbc` y `_fbp`
(las cookies del píxel), que sirven si algún día se le mandan a Meta las ventas cerradas.

**Del lado de n8n:** el envío usa `navigator.sendBeacon` con el cuerpo como `text/plain`, para
no disparar el preflight de CORS. n8n recibe el cuerpo como texto y lo parsea en el nodo
"Validar formulario". Los formularios quedan en la data table `strike_mayoristas_formularios`;
cuando se unen a un lead, la fila guarda `lead_id` y `unido`.

**Del lado de Kommo** (cuenta `jcaime`) tiene que haber un webhook de mensajes entrantes
apuntando al workflow. La URL no va acá: está en el nodo "Mensaje entrante de Kommo".

El payload:

```json
{
  "ref": "M-7K2QX",
  "comercio": "Juguetería El Globo",
  "rubro": "Juguetería",
  "ciudad": "Córdoba, Córdoba",
  "email": "compras@elglobo.com.ar",
  "utm_source": "meta", "utm_medium": "paid", "utm_campaign": "...", "utm_term": "...", "utm_content": "...",
  "fbclid": "", "fbc": "", "fbp": "", "referrer": "",
  "origen": "landing-mayoristas",
  "url": "https://mayoristas.strike360.com.ar/",
  "enviado": "2026-09-22T18:02:33.500Z",
  "token": "..."
}
```

`email` y todos los de origen pueden venir vacíos.

**Parámetros de URL de los anuncios de Meta** (a nivel anuncio, campo "Parámetros de URL"):

```
utm_source=meta&utm_medium=paid&utm_campaign={{campaign.name}}&utm_term={{adset.name}}&utm_content={{ad.name}}
```


## Favicon

La "S" con manos del logo, en blanco sobre el naranja de la marca (`#f0561c`). El original que
pasó Valentín viene en negro sobre fondo transparente, y así se volvía invisible en las pestañas
en modo oscuro; el fondo es lo que se agregó, el dibujo es el mismo, recortado a su recuadro real
y con un margen del 10% para que respire.

| Archivo | Para qué |
|---|---|
| `favicon.ico` | 32×32. Lo que pide el navegador por su cuenta a `/favicon.ico` |
| `favicon-32.png` | 32×32, el declarado en el `<head>` |
| `apple-touch-icon.png` | 180×180, para cuando se agrega a la pantalla de inicio en iOS |
| `icon-512.png` | 512×512, el original del que salen los demás; sirve de fuente si hay que regenerarlos |

Se generaron con `sips` a partir del PNG de 512.
