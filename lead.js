/* Envio del formulario mayorista al webhook de n8n (y de ahi a Kommo).
 *
 * Igual que pixel.js, esto vive fuera del index.html porque ese archivo se regenera
 * entero con cada export de Claude Design. Al subir un export nuevo solo hay que volver
 * a linkear <script src="lead.js"></script> en el <head>.
 *
 * Como esta pensado, segun lo que decidio Valentin el 22/09:
 *  - El envio no bloquea nada: WhatsApp se abre igual que siempre, lo haga el componente
 *    de la pagina por su lado. Este archivo no toca el formulario ni lo reemplaza.
 *  - Si el webhook falla, esta caido o rechaza el pedido, la persona no se entera y
 *    llega a WhatsApp lo mismo. Preferimos perder el registro antes que el contacto.
 *  - Se usa sendBeacon con cuerpo text/plain: el navegador lo manda en segundo plano,
 *    no espera respuesta y, al ser un pedido "simple", no dispara el preflight de CORS.
 *    n8n igual parsea el JSON del cuerpo. Si el navegador no lo soporta, cae a fetch.
 */

/* ------------------------------------------------------------------------- *
 *  COMPLETAR: la URL del webhook de produccion de n8n.
 *  Mientras este vacio, el formulario sigue andando y esto no hace nada.
 * ------------------------------------------------------------------------- */
var WEBHOOK = '';

/* Viaja en el cuerpo para que n8n descarte ruido. No es seguridad: cualquiera que mire
   el archivo lo ve. La validacion de verdad va del lado de n8n. */
var TOKEN = '';

(function () {
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f || f.tagName !== 'FORM' || !f.comercio) return;

    var comercio = (f.comercio.value || '').trim();
    var rubro = f.rubro ? f.rubro.value : '';
    var ciudad = f.ciudad ? (f.ciudad.value || '').trim() : '';
    var email = f.email ? (f.email.value || '').trim() : '';

    /* Los mismos tres obligatorios que valida la pagina; el mail es opcional. */
    if (!comercio || !rubro || !ciudad) return;
    if (!WEBHOOK) return;

    var datos = {
      comercio: comercio,
      rubro: rubro,
      ciudad: ciudad,
      email: email,
      origen: 'landing-mayoristas',
      url: location.href,
      enviado: new Date().toISOString(),
      token: TOKEN
    };

    try {
      var cuerpo = JSON.stringify(datos);
      var mandado = false;
      if (navigator.sendBeacon) {
        mandado = navigator.sendBeacon(WEBHOOK, new Blob([cuerpo], { type: 'text/plain;charset=UTF-8' }));
      }
      if (!mandado) {
        fetch(WEBHOOK, {
          method: 'POST',
          mode: 'no-cors',
          keepalive: true,
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: cuerpo
        }).catch(function () { /* a proposito: el contacto no se frena por esto */ });
      }
    } catch (err) { /* idem */ }
  }, true);
})();
