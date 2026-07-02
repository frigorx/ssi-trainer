/**
 * Lecture adaptée — bouton flottant « a A » (taille du texte, interligne, espacement).
 * Aide à la lecture pour tout élève qui en a besoin, sans étiquette ni diagnostic affiché :
 * un réglage neutre, au même titre qu'un réglage de confort visuel.
 *
 * Module autonome (injecte son propre CSS + DOM) : inclure sur chaque page avec
 *   <script src="js/lecture-adaptee.js" defer></script>
 * Réglages persistés en localStorage, partagés entre toutes les pages du site.
 *
 * Le multiplicateur de taille utilise `zoom` (large support navigateurs 2024+) car les pages
 * sont en unités fixes (px/pt) : c'est le mécanisme le plus fiable pour tout agrandir
 * uniformément sans casser les mises en page existantes.
 */
(function () {
  'use strict';
  var CLE = 'ssi-trainer:lecture';
  // Éléments « équipement » (panneau synoptique, écran LCD) : on ne touche pas à leur
  // espacement/interligne, déjà calibrés pour simuler un vrai afficheur technique.
  var EXCLUS = '.lcd-line,.zone-led-label,.indicator-label,.das-row,.zone-card-label,' +
    '.btn-ecs,.btn-acquit-zone,.journal-list,.chrono,.ecs-banner,#lectBtn,#lectPanel';

  function lire() {
    var d = { taille: 0, interligne: false, espacement: false };
    try { return Object.assign(d, JSON.parse(localStorage.getItem(CLE) || '{}')); }
    catch (e) { return d; }
  }
  function ecrire(v) { try { localStorage.setItem(CLE, JSON.stringify(v)); } catch (e) {} }

  function appliquer(v) {
    var h = document.documentElement;
    h.classList.remove('lect-t1', 'lect-t2', 'lect-t3');
    if (v.taille > 0) h.classList.add('lect-t' + v.taille);
    h.classList.toggle('lect-interligne', !!v.interligne);
    h.classList.toggle('lect-espacement', !!v.espacement);
  }

  function injecterStyle() {
    var css =
      'html.lect-t1 body{zoom:1.15}html.lect-t2 body{zoom:1.3}html.lect-t3 body{zoom:1.5}' +
      'html.lect-interligne body,html.lect-interligne p,html.lect-interligne li,html.lect-interligne td,html.lect-interligne th,html.lect-interligne label,html.lect-interligne div{line-height:1.85!important}' +
      'html.lect-espacement body,html.lect-espacement p,html.lect-espacement li,html.lect-espacement td,html.lect-espacement th,html.lect-espacement label{letter-spacing:.035em!important;word-spacing:.14em!important}' +
      EXCLUS + '{letter-spacing:normal!important;word-spacing:normal!important;line-height:normal!important}' +
      '#lectBtn{position:fixed;right:16px;bottom:16px;z-index:9999;width:52px;height:52px;border-radius:50%;background:#1b3a63;color:#fff;border:none;cursor:pointer;box-shadow:0 3px 12px rgba(0,0,0,.28);font-family:Calibri,Arial,sans-serif;display:flex;align-items:center;justify-content:center;gap:1px;font-weight:bold;padding:0}' +
      '#lectBtn:hover{background:#142d4e}#lectBtn .a1{font-size:.8em}#lectBtn .a2{font-size:1.35em}' +
      '#lectPanel{position:fixed;right:16px;bottom:76px;z-index:9999;background:#fff;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.28);padding:16px 18px;width:252px;font-family:Calibri,Arial,sans-serif;color:#1b3a63;display:none;box-sizing:border-box}' +
      '#lectPanel.open{display:block}#lectPanel h4{font-family:"Trebuchet MS",sans-serif;font-size:1em;margin:0 0 10px;color:#1b3a63}' +
      '#lectPanel .row{margin-bottom:12px}#lectPanel .lbl{font-size:.82em;color:#555;margin-bottom:5px;display:block}' +
      '#lectPanel .sizes{display:flex;gap:5px}' +
      '#lectPanel .sizes button{flex:1;border:1.5px solid #c7d0de;background:#fff;border-radius:6px;padding:6px 0;cursor:pointer;font-family:Calibri,Arial,sans-serif;color:#1b3a63;line-height:1}' +
      '#lectPanel .sizes button.actif{background:#1b3a63;color:#fff;border-color:#1b3a63}' +
      '#lectPanel .sizes button:nth-child(1){font-size:.72em}#lectPanel .sizes button:nth-child(2){font-size:.88em}#lectPanel .sizes button:nth-child(3){font-size:1.05em}#lectPanel .sizes button:nth-child(4){font-size:1.22em}' +
      '#lectPanel .toggle{display:flex;align-items:center;justify-content:space-between;font-size:.88em;gap:10px}' +
      '#lectPanel .toggle input{width:18px;height:18px;flex-shrink:0}' +
      '#lectPanel .reset{width:100%;margin-top:4px;background:none;border:1px solid #c7d0de;border-radius:6px;padding:6px;cursor:pointer;font-size:.82em;color:#666}#lectPanel .reset:hover{background:#f2f5fb}' +
      '@media print{#lectBtn,#lectPanel{display:none!important}}';
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  function injecterDOM(v) {
    var btn = document.createElement('button');
    btn.id = 'lectBtn'; btn.type = 'button';
    btn.setAttribute('aria-label', 'Lecture adaptée : taille du texte, interligne, espacement');
    btn.setAttribute('aria-haspopup', 'true');
    btn.innerHTML = '<span class="a1">a</span><span class="a2">A</span>';

    var panel = document.createElement('div');
    panel.id = 'lectPanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Réglages de lecture adaptée');
    panel.innerHTML =
      '<h4>Lecture adaptée</h4>' +
      '<div class="row"><span class="lbl">Taille du texte</span><div class="sizes">' +
      [0, 1, 2, 3].map(function (i) { return '<button type="button" data-t="' + i + '" aria-label="Taille ' + (i + 1) + ' sur 4">A</button>'; }).join('') +
      '</div></div>' +
      '<div class="row toggle"><label for="lectInterligne">Interligne aéré</label><input type="checkbox" id="lectInterligne"></div>' +
      '<div class="row toggle"><label for="lectEspacement">Espacement des lettres</label><input type="checkbox" id="lectEspacement"></div>' +
      '<button type="button" class="reset" id="lectReset">Réinitialiser</button>';

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    function refreshUI() {
      panel.querySelectorAll('.sizes button').forEach(function (b) {
        b.classList.toggle('actif', Number(b.getAttribute('data-t')) === v.taille);
      });
      panel.querySelector('#lectInterligne').checked = !!v.interligne;
      panel.querySelector('#lectEspacement').checked = !!v.espacement;
    }
    refreshUI();

    btn.addEventListener('click', function () { panel.classList.toggle('open'); });
    document.addEventListener('click', function (e) {
      if (panel.classList.contains('open') && !panel.contains(e.target) && e.target !== btn) panel.classList.remove('open');
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') panel.classList.remove('open'); });

    panel.querySelectorAll('.sizes button').forEach(function (b) {
      b.addEventListener('click', function () {
        v.taille = Number(b.getAttribute('data-t'));
        ecrire(v); appliquer(v); refreshUI();
      });
    });
    panel.querySelector('#lectInterligne').addEventListener('change', function (e) {
      v.interligne = e.target.checked; ecrire(v); appliquer(v);
    });
    panel.querySelector('#lectEspacement').addEventListener('change', function (e) {
      v.espacement = e.target.checked; ecrire(v); appliquer(v);
    });
    panel.querySelector('#lectReset').addEventListener('click', function () {
      v = { taille: 0, interligne: false, espacement: false };
      ecrire(v); appliquer(v); refreshUI();
    });
  }

  var etat = lire();
  appliquer(etat); // appliqué au plus tôt pour limiter le flash visuel

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { injecterStyle(); injecterDOM(etat); });
  } else {
    injecterStyle(); injecterDOM(etat);
  }
})();
