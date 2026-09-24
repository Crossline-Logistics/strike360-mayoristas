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
 *
 * Los UTM (24/09): la charla con el comercio pasa en WhatsApp, y es ese lead de Kommo
 * (el del chat, con el telefono) el que despues se marca como vendido. Para que los UTM
 * terminen ahi, cada envio lleva un codigo corto ("ref. M-7K2QX") que viaja a n8n junto
 * con los UTM y tambien al final del mensaje de WhatsApp. Cuando el mensaje entra a Kommo,
 * n8n encuentra el codigo y le pega los UTM a ese lead. El codigo se agrega al mensaje
 * interceptando window.open, para no tocar el componente del index.html.
 */

/* URL del webhook de produccion de n8n. Si se vacia, el formulario sigue andando igual
   y esto no hace nada (ni manda datos ni agrega el codigo al mensaje). */
var WEBHOOK = 'https://webhook.crossline-logistics.com/webhook/strike-mayoristas-lead';

/* Viaja en el cuerpo para que n8n descarte ruido. No es seguridad: cualquiera que mire
   el archivo lo ve. La validacion de verdad va del lado de n8n. */
var TOKEN = 'xO62fOPW9OZ4EdbW';

(function () {
  var CLAVE = 'strike_mayoristas_origen';
  var CAMPOS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid'];

  /* Al entrar: si la URL trae UTM o fbclid, se guardan para la pestaña. Asi sobreviven
     aunque la URL cambie antes de que la persona llene el formulario. */
  function leerUrl() {
    var p = new URLSearchParams(location.search);
    var o = {}, hay = false;
    CAMPOS.forEach(function (k) {
      var v = (p.get(k) || '').trim();
      if (v) { o[k] = v.slice(0, 200); hay = true; }
    });
    if (!hay) return null;
    o.referrer = (document.referrer || '').slice(0, 300);
    return o;
  }

  function origen() {
    var o = null;
    try { o = JSON.parse(sessionStorage.getItem(CLAVE) || 'null'); } catch (e) { /* sin storage */ }
    return o || leerUrl() || { referrer: (document.referrer || '').slice(0, 300) };
  }

  var alEntrar = leerUrl();
  if (alEntrar) {
    try { sessionStorage.setItem(CLAVE, JSON.stringify(alEntrar)); } catch (e) { /* sin storage */ }
  }

  function galleta(nombre) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + nombre + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }

  /* Sin 0/O ni 1/I/L, para que nadie los confunda si lo lee en voz alta. */
  function codigo() {
    var abc = '23456789ABCDEFGHJKMNPQRSTUVWXYZ', s = 'M-';
    var r = new Uint32Array(5);
    (window.crypto || window.msCrypto).getRandomValues(r);
    for (var i = 0; i < 5; i++) s += abc[r[i] % abc.length];
    return s;
  }

  /* Suma el codigo al texto del link de WhatsApp que abre el componente, una sola vez. */
  function marcarProximoWhatsApp(ref) {
    var original = window.open;
    var restaurar = function () { if (window.open !== original) window.open = original; };
    window.open = function (url) {
      restaurar();
      var args = Array.prototype.slice.call(arguments);
      try {
        if (typeof url === 'string' && /^https:\/\/wa\.me\//.test(url) && url.indexOf('text=') !== -1) {
          args[0] = url + encodeURIComponent(' (ref. ' + ref + ')');
        }
      } catch (e) { /* si algo falla, sale el link original */ }
      return original.apply(window, args);
    };
    setTimeout(restaurar, 0);
  }

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

    var ref;
    try { ref = codigo(); marcarProximoWhatsApp(ref); } catch (err) { ref = ''; }

    var o = origen();
    var datos = {
      ref: ref,
      comercio: comercio,
      rubro: rubro,
      ciudad: ciudad,
      email: email,
      utm_source: o.utm_source || '',
      utm_medium: o.utm_medium || '',
      utm_campaign: o.utm_campaign || '',
      utm_term: o.utm_term || '',
      utm_content: o.utm_content || '',
      fbclid: o.fbclid || '',
      fbc: galleta('_fbc'),
      fbp: galleta('_fbp'),
      referrer: o.referrer || '',
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
