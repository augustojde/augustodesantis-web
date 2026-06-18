/* ============================================================
   popup.js — Newsletter popup | augustodesantis.com.ar
   Integración con Perfit API v1

   CONFIGURACIÓN OBLIGATORIA ANTES DE SUBIR:
   1. Reemplazá TU_API_KEY_PERFIT con tu token de Perfit
      → app.myperfit.com → tu nombre → Configuración → API
   2. Los nombres de las listas ya están configurados abajo.
      Verificá que coincidan exactamente con los de tu cuenta.
   ============================================================ */

(function () {

  // ── CONFIGURACIÓN ──────────────────────────────────────────
  var PERFIT_API_KEY = 'fapglobalconsu-vi2hIENcEEguj515D5wPazH7TfGhDtNa';   // 

  // Mapeo sector → lista(s) en Perfit
  // Académico y Otro van a las tres listas (audiencia transversal)
  var LISTAS_POR_SECTOR = {
    'Aviacion':  ['AERONAUTICOS'],
    'Salud':     ['SALUD'],
    'Industria': ['industria y difusión'],
    'Academico': ['AERONAUTICOS', 'SALUD', 'industria y difusión'],
    'Otro':      ['AERONAUTICOS', 'SALUD', 'industria y difusión']
  };

  var DELAY_SEG      = 8;    // segundos antes de mostrar el popup
  var STORAGE_KEY    = 'ads_popup_ts';
  var DAYS_CERRADO   = 30;   // días sin mostrar si cerró sin suscribirse
  var DAYS_SUSCRIPTO = 90;   // días sin mostrar si se suscribió
  // ──────────────────────────────────────────────────────────

  // ── REFERENCIAS DOM ───────────────────────────────────────
  var overlay    = document.getElementById('ads-overlay');
  var popup      = document.getElementById('ads-popup');
  var closeBtn   = document.getElementById('ads-close-btn');
  var form       = document.getElementById('ads-form');
  var statusEl   = document.getElementById('ads-status');
  var submitBtn  = document.getElementById('ads-submit');
  var successDiv = document.getElementById('ads-success');
  // ──────────────────────────────────────────────────────────

  // ── HELPERS LOCALSTORAGE ──────────────────────────────────
  function shouldShow() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return true;
      var data = JSON.parse(raw);
      var diffDays = (Date.now() - data.ts) / 86400000;
      return diffDays >= (data.subscribed ? DAYS_SUSCRIPTO : DAYS_CERRADO);
    } catch (e) { return true; }
  }

  function saveDismissed(subscribed) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ts: Date.now(),
        subscribed: !!subscribed
      }));
    } catch (e) {}
  }
  // ──────────────────────────────────────────────────────────

  // ── MOSTRAR / OCULTAR ─────────────────────────────────────
  function show() {
    overlay.classList.add('visible');
    popup.classList.add('visible');
    popup.removeAttribute('aria-hidden');
    var first = popup.querySelector('input');
    if (first) setTimeout(function () { first.focus(); }, 350);
  }

  function hide(subscribed) {
    overlay.classList.remove('visible');
    popup.classList.remove('visible');
    popup.setAttribute('aria-hidden', 'true');
    saveDismissed(subscribed);
  }
  // ──────────────────────────────────────────────────────────

  // ── INICIAR ───────────────────────────────────────────────
  if (shouldShow()) {
    setTimeout(show, DELAY_SEG * 1000);
  }

  // ── EVENTOS DE CIERRE ─────────────────────────────────────
  closeBtn.addEventListener('click', function () { hide(false); });
  overlay.addEventListener('click', function () { hide(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && popup.classList.contains('visible')) {
      hide(false);
    }
  });

  // ── VALIDACIÓN ────────────────────────────────────────────
  function validate() {
    var nombre = document.getElementById('ads-nombre').value.trim();
    var email  = document.getElementById('ads-email').value.trim();
    var sector = document.getElementById('ads-sector').value;
    if (!nombre)  return 'Ingresá tu nombre.';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
                  return 'Ingresá un email válido.';
    if (!sector)  return 'Seleccioná tu sector.';
    return null;
  }

  // ── ENVÍO A PERFIT ────────────────────────────────────────
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var err = validate();
    if (err) {
      statusEl.textContent = err;
      statusEl.className = 'error';
      return;
    }

    statusEl.textContent = 'Enviando…';
    statusEl.className = '';
    submitBtn.disabled = true;

    var sector  = document.getElementById('ads-sector').value;
    var listas  = LISTAS_POR_SECTOR[sector] || ['AERONAUTICOS', 'SALUD', 'industria y difusión'];

    var payload = {
      email:     document.getElementById('ads-email').value.trim(),
      firstName: document.getElementById('ads-nombre').value.trim(),
      customFields: {
        empresa: document.getElementById('ads-empresa').value.trim(),
        sector:  sector,
        origen:  'Popup Web'
      },
      lists:  listas,
      status: 'active'
    };

    fetch('https://api.myperfit.com/v1/contacts', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + PERFIT_API_KEY
      },
      body: JSON.stringify(payload)
    })
    .then(function (res) {
      // 409 = contacto ya existe → igualmente éxito
      if (res.ok || res.status === 409) {
        onSuccess();
      } else {
        return res.json().then(function (d) {
          throw new Error(d.message || 'Error ' + res.status);
        });
      }
    })
    .catch(function (err) {
      console.error('[Popup Perfit]', err);
      statusEl.textContent = 'Hubo un error. Intentá de nuevo o escribinos directamente.';
      statusEl.className = 'error';
      submitBtn.disabled = false;
    });
  });

  // ── ÉXITO ─────────────────────────────────────────────────
  function onSuccess() {
    form.style.display = 'none';
    statusEl.textContent = '';
    successDiv.style.display = 'block';

    // Cerrar automáticamente en 4 segundos
    setTimeout(function () {
      hide(true);
      setTimeout(function () {
        form.style.display = '';
        successDiv.style.display = 'none';
        submitBtn.disabled = false;
        form.reset();
      }, 400);
    }, 4000);
  }

})();
