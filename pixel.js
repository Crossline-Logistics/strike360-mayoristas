/* Meta Pixel — Strike 360 (ID 363383224585035, "Píxel de Strike 360 - Oficial").
 *
 * Todo el tracking vive en este archivo a proposito: el index.html sale de un export
 * de Claude Design y se regenera entero cada vez. Cuando llegue un export nuevo alcanza
 * con volver a poner <script src="pixel.js"></script> en el <head>; nada de esto se pierde.
 *
 * Los eventos se enganchan por delegacion en document, no sobre los nodos, porque la
 * pagina la renderiza React despues de cargar: cuando este archivo corre, el formulario
 * y los botones todavia no existen.
 */
(function (f, b, e, v, n, t, s) {
  if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
  if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
  t = b.createElement(e); t.async = !0; t.src = v;
  s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
})(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

fbq('init', '363383224585035');
fbq('track', 'PageView');

/* Lead: el envio del formulario, que es lo que abre WhatsApp con el mensaje armado.
   Se repite la validacion del componente (comercio, rubro y ciudad son los obligatorios;
   el mail es opcional) para no contar como lead un intento que la pagina rechaza. */
document.addEventListener('submit', function (e) {
  var f = e.target;
  if (!f || f.tagName !== 'FORM' || !f.comercio) return;
  var comercio = (f.comercio.value || '').trim();
  var rubro = f.rubro ? f.rubro.value : '';
  var ciudad = f.ciudad ? (f.ciudad.value || '').trim() : '';
  if (!comercio || !rubro || !ciudad) return;
  fbq('track', 'Lead', { content_name: 'Formulario mayoristas', content_category: rubro });
}, true);

document.addEventListener('click', function (e) {
  var a = e.target.closest ? e.target.closest('a') : null;
  if (!a) return;
  var href = a.getAttribute('href') || '';

  /* Contact: el mail mayorista del pie. */
  if (href.indexOf('mailto:') === 0) { fbq('track', 'Contact', { content_name: 'Mail mayorista' }); return; }

  /* Por si en algun momento se agrega un enlace directo a WhatsApp fuera del formulario. */
  if (href.indexOf('wa.me') !== -1 || href.indexOf('api.whatsapp.com') !== -1) {
    fbq('track', 'Contact', { content_name: 'WhatsApp directo' }); return;
  }

  /* Los tres botones que bajan al formulario. Evento propio, no es una conversion:
     sirve para ver cuantos llegan a la intencion y cuantos terminan enviando. */
  if (href === '#contacto') fbq('trackCustom', 'ClickCTA', { content_name: a.textContent.trim().slice(0, 40) });
}, true);
