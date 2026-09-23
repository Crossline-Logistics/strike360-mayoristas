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

6. Hay que volver a poner `<script src="pixel.js"></script>` y `<script src="lead.js"></script>`
   en el `<head>`, al lado del de `support.js`. El tracking de Meta y el envío del lead viven
   en esos dos archivos justamente para que un export nuevo no se los lleve puestos: adentro
   de ellos no hay que tocar nada.

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


## El lead a n8n

`lead.js` manda los datos del formulario al webhook de n8n (y de ahí a Kommo). **Falta la URL**:
está como `WEBHOOK` al principio del archivo y mientras esté vacía no se envía nada, sin romper
nada. `TOKEN` viaja en el cuerpo para que n8n descarte ruido; no es seguridad, cualquiera que
abra el archivo lo ve.

Cómo está pensado, según lo que decidió Valentín el 22/09:

- El formulario **sigue abriendo WhatsApp igual**. `lead.js` no lo reemplaza ni lo toca: escucha
  el envío y manda una copia por atrás.
- Si el webhook está caído o rechaza el pedido, **la persona no se entera y llega a WhatsApp
  lo mismo**. Se prefiere perder el registro antes que el contacto.
- Queda de un solo paso: son cuatro campos y tres obligatorios.

**Lo que hay que saber del lado de n8n:** el envío usa `navigator.sendBeacon` con el cuerpo como
`text/plain`. Es a propósito — así el navegador lo manda en segundo plano y el pedido no dispara
el preflight de CORS, que es lo que suele romper estos envíos desde una página estática. La
contra: **n8n recibe el cuerpo como texto, no como JSON ya parseado**, así que en el workflow hay
que hacer `JSON.parse($json.body)` antes de usar los campos.

El payload:

```json
{
  "comercio": "Juguetería El Globo",
  "rubro": "Juguetería",
  "ciudad": "Córdoba, Córdoba",
  "email": "compras@elglobo.com.ar",
  "origen": "landing-mayoristas",
  "url": "https://mayoristas.strike360.com.ar/",
  "enviado": "2026-09-22T18:02:33.500Z",
  "token": ""
}
```

`email` puede venir vacío: es el único campo opcional.
