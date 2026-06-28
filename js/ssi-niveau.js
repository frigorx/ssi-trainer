/**
 * SSI Trainer — Contrôleur générique d'un niveau (équipement data-driven)
 * inerWeb Édu — F. Henninot
 *
 * Génère l'équipement (voyants, LCD, niveau d'accès, boutons, zones et DAS
 * construits DEPUIS le scénario) et le document élève (PosteEleve), puis câble
 * moteur + lecteur + évaluation + profil. Réutilisé par les Niveaux 2 et 3 :
 * seules changent la configuration (titre, marque, scénarios proposés).
 *
 * Dépend de : ssi-engine.js, audio.js, scenario-player.js, scenario-pedago.js,
 *             profil-eleve.js, evaluation.js  + css equipement.css + pedago.css
 */
(function (global) {
  'use strict';

  function initSSINiveau(config) {
    config = config || {};
    var ACCES_CODE = config.accesCode || '2222';

    // ---- Instances ----
    var engine = new SSIEngine({ delaiVeilleRestreinte: 300000, doubleKnock: true });
    var audio = new SSIAudio();
    var player = new ScenarioPlayer(engine, audio);
    var profil = new ProfilEleve();
    var evaluation = new Evaluation({ referentiel: {} });
    var REFERENTIEL_COMP = {};
    var DIPLOMES_INFO = [];

    var poste = new PosteEleve({
      onAction: function (cle, payload) {
        audio.resume(); audio.click();
        payload = payload || {};
        if (cle === 'levee_doute') engine.leveeDoute();
        else if (cle === 'appel_18') engine.appel18(payload.message);
        else if (cle === 'accueil_pompiers') engine.accueilPompiers();
        else if (cle === 'reconnaitre_defaut_das') engine.reconnaitreDefautDAS(payload.dasId);
        else if (cle === 'coupure_energies') engine.coupureEnergies();
        else if (cle === 'traiter_cause') engine.leverCause();
        else if (cle === 'commande_das') {
          (payload.dasIds || []).forEach(function (id) { engine.commandeManuelle(id); });
        }
      },
      onCompteRendu: function (feu, rapport) {
        addJournalEntry({ time: nowHeure(), type: 'INFO', message: 'Équipier (compte-rendu) — ' + rapport });
      },
      getEtatDAS: function () { return engine.getDAS(); },
      accesNiveau: function () { return niveauAcces; },
      onAccesRequis: function () { ouvrirModaleAcces('Accès niveau 2 requis pour cette commande engageante.'); }
    });

    // ---- État ----
    var scenarioCourant = null, niveauAcces = 1, modeActuel = 'guide';
    var bilanAffiche = false, testMode = false, testTimeout = null;
    var zoneNoms = {};

    // ---- Helpers ----
    function esc(s) { return (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function fmtNote(n) { return (Math.round(n * 2) / 2).toString().replace('.', ','); }
    function nowHeure() { return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
    function padLCD(t) { t = t || ''; var s = t.substring(0, 20); return s + ' '.repeat(Math.max(0, 20 - s.length)); }
    function $(id) { return document.getElementById(id); }
    var _toastTimer = null;
    function showToast(msg, type) {
      var t = document.getElementById('ssiToast');
      if (!t) {
        t = document.createElement('div'); t.id = 'ssiToast';
        t.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2000;max-width:90%;padding:12px 20px;border-radius:8px;font-size:0.9em;font-weight:bold;box-shadow:0 6px 24px rgba(0,0,0,0.25);text-align:center';
        document.body.appendChild(t);
      }
      t.style.background = type === 'error' ? '#c62828' : '#1b3a63';
      t.style.color = '#fff'; t.textContent = msg; t.style.display = 'block';
      if (_toastTimer) clearTimeout(_toastTimer);
      _toastTimer = setTimeout(function () { t.style.display = 'none'; }, 5000);
    }

    // ============================================================ UI : squelette
    function buildUI() {
      var app = $('app');
      app.innerHTML =
        '<div class="main-layout">' +
        '<div class="ecs-panel">' +
          '<div class="ecs-banner">' + esc(config.banniere || 'Système de Sécurité Incendie') + '<div class="ecs-brand">' + esc(config.brand || 'INERFIRE') + '</div></div>' +
          '<div class="general-indicators">' +
            ind('led-sousTension', 'led-green on', 'Sous<br>Tension') + ind('led-alarmeFeu', 'led-red', 'Alarme<br>Feu') +
            ind('led-derangement', 'led-yellow', 'D&eacute;rang') + ind('led-horsService', 'led-yellow', 'Hors<br>Service') +
            ind('led-essais', 'led-yellow', 'Essais') +
          '</div>' +
          '<div class="lcd-container"><div class="lcd-title">Afficheur</div><div class="lcd-screen">' +
            '<span class="lcd-line" id="lcd-line1">VEILLE NORMALE</span><span class="lcd-line" id="lcd-line2">--------------------</span>' +
            '<span class="lcd-line" id="lcd-line3">SYSTEME OPERATIONNEL</span><span class="lcd-line" id="lcd-line4">--:--:--</span>' +
          '</div></div>' +
          '<div class="pe-acces" id="accesPad"><span class="pe-acces-niv">ACC&Egrave;S : <b id="accesNivTxt">NIV.1 &mdash; EXPLOITATION</b></span>' +
            '<button class="pe-acces-btn" id="accesBtn">&#128273; PASSER NIV.2</button></div>' +
          '<div class="buttons-section">' +
            '<button class="btn-ecs btn-acq" id="btnAcq">&#9654; Acquittement</button>' +
            '<button class="btn-ecs btn-rearm" id="btnRearm">&#8634; R&eacute;armement</button>' +
            '<button class="btn-ecs btn-test" id="btnTest">&#9881; Test Signal.</button>' +
            '<button class="btn-ecs btn-arret" id="btnArret">&#128263; Arr&ecirc;t Signal</button>' +
            '<button class="btn-ecs btn-evac verrou" id="btnEvac"><span class="cadenas" id="evacCad">&#128274;</span> &Eacute;VACUATION G&Eacute;N&Eacute;RALE</button>' +
          '</div>' +
          '<div class="zones-section" id="zonesGrid"></div>' +
          '<div class="das-section" id="dasSection" style="display:none"><div class="das-title">Dispositifs Actionn&eacute;s de S&eacute;curit&eacute; (DAS)</div><div id="dasRows"></div></div>' +
        '</div>' +
        '<div class="pedagogy-panel">' +
          '<div class="pe-bloc" id="peProfil"><div class="pe-bloc-titre"><span class="pe-ico">&#128100;</span> &Eacute;l&egrave;ve</div>' +
            '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;font-size:0.82em">' +
              lab('Nom et pr&eacute;nom', '<input type="text" id="profNom" style="' + inputCss() + '">') +
              lab('Classe', '<input type="text" id="profClasse" style="' + inputCss() + '">') +
              lab('Dipl&ocirc;me pr&eacute;par&eacute;', '<select id="profDiplome" style="' + inputCss() + '"></select>') +
            '</div><div id="profPerimetre" style="font-size:0.72em;color:#888;margin-top:8px"></div></div>' +
          '<div class="scenario-header"><span class="scenario-badge" id="scenarioBadge">Aucun sc&eacute;nario</span><span class="chrono" id="chronoDisplay">00:00</span></div>' +
          '<div class="scenario-controls">' +
            '<select id="scenarioSelect"><option value="">-- Choisir un sc&eacute;nario --</option></select>' +
            '<button class="btn-pedagogy btn-start" id="btnDemarrer" disabled>&#9654; D&eacute;marrer</button>' +
            '<button class="btn-pedagogy btn-pause" id="btnPause" style="display:none">&#10074;&#10074; Pause</button>' +
            '<button class="btn-pedagogy btn-stop" id="btnStop" style="display:none">&#9632; Arr&ecirc;ter</button>' +
            '<button class="btn-pedagogy btn-aide" id="btnAide">? Aide</button>' +
            '<span class="ctrl-sep"></span>' +
            '<div class="pe-palier" id="palierSelect"><button class="actif" data-mode="guide">Guid&eacute;</button>' +
              '<button data-mode="autonome">Autonome</button><button data-mode="exploration">Exploration</button></div>' +
            '<div class="pe-fiche-btns" style="margin-left:auto">' +
              '<button class="pe-btn pe-btn-fiche" id="btnImprimer" disabled>&#128424; Fiche</button>' +
              '<button class="pe-btn pe-btn-fiche" id="btnTelecharger" disabled>&#11015; T&eacute;l&eacute;charger</button></div>' +
          '</div>' +
          '<div id="scenAvert" style="display:none;font-size:0.78em;color:#c62828;background:#fff3f3;border:1px solid #f3c6c6;border-radius:6px;padding:6px 10px">Aucun sc&eacute;nario ne correspond &agrave; ce dipl&ocirc;me &agrave; ce niveau (ce niveau s\'adresse &agrave; un dipl&ocirc;me plus avanc&eacute;).</div>' +
          '<div id="peMission" class="pe-bloc pe-mission"></div>' +
          '<div id="peActions" class="pe-bloc"></div>' +
          '<div id="peConduite" class="pe-bloc"></div>' +
          '<div id="peMainCourante" class="pe-bloc"></div>' +
          '<div id="peQuestions" class="pe-bloc"></div>' +
          '<div class="journal-section"><div class="journal-title">Journal des &eacute;v&eacute;nements (syst&egrave;me)</div>' +
            '<div class="journal-list" id="journalList" aria-live="polite" aria-label="Journal des événements"><div class="journal-entry info"><span class="time">--:--:--</span> &mdash; S&eacute;lectionnez un sc&eacute;nario.</div></div></div>' +
          '<div class="scoring-section"><div class="scoring-title">Suivi de progression <span class="scoring-sub">(retour formatif &mdash; non transmis)</span></div>' +
            '<div class="scoring-bar"><div class="scoring-fill good" id="scoringFill" style="width:0%">0%</div></div>' +
            '<div class="scoring-details"><div class="scoring-item"><span class="scoring-dot scoring-dot-ok"></span> Correct : <strong id="scoreOk">0</strong></div>' +
            '<div class="scoring-item"><span class="scoring-dot scoring-dot-retard"></span> Retard : <strong id="scoreRetard">0</strong></div>' +
            '<div class="scoring-item"><span class="scoring-dot scoring-dot-manque"></span> Manqu&eacute; : <strong id="scoreManque">0</strong></div></div></div>' +
        '</div></div>';

      // Modales aide / bilan / accès
      var m = document.createElement('div');
      m.innerHTML =
        '<div class="modal-overlay" id="aideModal"><div class="modal-aide" role="dialog" aria-modal="true" aria-label="Fiche de poste"><button class="close-btn" id="aideClose" aria-label="Fermer">&times;</button>' +
          '<h3>Fiche de poste &mdash; Op&eacute;rateur SSI</h3>' +
          '<ol><li><strong>Acquitter</strong> l\'alarme</li><li><strong>Localiser</strong> la zone</li><li><strong>Lev&eacute;e de doute</strong> par un &eacute;quipier</li>' +
          '<li><strong>Si feu</strong> : alerter le 18/112 (message structur&eacute;)</li><li>Passer en <strong>acc&egrave;s niveau 2</strong> puis <strong>commander les DAS</strong> (compartimentage, d&eacute;senfumage)</li>' +
          '<li><strong>D&eacute;clencher l\'&eacute;vacuation</strong></li><li><strong>Accueillir les secours</strong> (plans, cl&eacute;s, point de situation)</li></ol>' +
          '<div class="code-box">&#128273; <strong>Code d\'acc&egrave;s niveau 2</strong> : <strong>2&nbsp;2&nbsp;2&nbsp;2</strong> &mdash; requis pour les commandes engageantes (DAS, coupures, &eacute;vacuation).</div>' +
          '<p class="fiche-title">R&eacute;f&eacute;rences</p><table><tr><th>Norme</th><th>Objet</th></tr>' +
          '<tr><td>NF S 61-931</td><td>SSI &mdash; dispositions g&eacute;n&eacute;rales</td></tr><tr><td>NF S 61-934</td><td>CMSI</td></tr>' +
          '<tr><td>NF S 61-937</td><td>DAS (PCF &lt; 30 s, ventouses)</td></tr><tr><td>Arr&ecirc;t&eacute; 2 mai 2005</td><td>Qualification SSIAP</td></tr></table></div></div>' +
        '<div class="pe-modal-ov" id="modalAcces"><div class="pe-modal" role="dialog" aria-modal="true" aria-label="Niveau d\'accès 2"><h3>&#128273; Niveau d\'acc&egrave;s 2</h3>' +
          '<div class="pe-modal-sub" id="accesMsg">Les commandes engageantes exigent le niveau d\'acc&egrave;s 2 (NF S 61-931). Saisissez le code.</div>' +
          '<label for="accesCode">Code d\'acc&egrave;s</label><input type="password" id="accesCode" maxlength="4" inputmode="numeric" placeholder="____" style="text-align:center;letter-spacing:8px;font-size:1.2em">' +
          '<div id="accesErr" style="color:#c62828;font-size:0.82em;min-height:1.2em;margin-top:4px"></div>' +
          '<div class="pe-modal-row"><button class="pe-btn pe-btn-ghost" id="accesAnnuler">Annuler</button><button class="pe-btn pe-btn-primary" id="accesValider">Valider</button></div></div></div>' +
        '<div class="bilan-overlay" id="bilanOverlay"><div class="bilan-modal" role="dialog" aria-modal="true" aria-label="Bilan"><h3>Bilan de la mise en situation</h3><div id="bilanContent"></div>' +
          '<button class="btn-close-bilan" id="bilanClose">Fermer</button></div></div>';
      document.body.appendChild(m);

      poste.monter({ mission: $('peMission'), conduite: $('peConduite'), actions: $('peActions'), mainCourante: $('peMainCourante'), questions: $('peQuestions') });
      brancherEvenements();
    }

    function ind(id, cls, label) { return '<div class="indicator"><div class="led ' + cls + '" id="' + id + '"></div><span class="indicator-label">' + label + '</span></div>'; }
    function lab(t, inner) { return '<label style="display:flex;flex-direction:column;gap:3px;flex:1;min-width:130px">' + t + inner + '</label>'; }
    function inputCss() { return 'padding:6px 8px;border:1px solid #dde2ea;border-radius:6px;font-family:Calibri,sans-serif'; }

    // ============================================================ Câblage UI
    function brancherEvenements() {
      $('btnAcq').onclick = function () { audio.resume(); audio.click(); engine.acquitter(); };
      $('btnRearm').onclick = function () { audio.resume(); audio.click(); engine.rearmement(); };
      $('btnArret').onclick = function () { audio.resume(); audio.click(); engine.arreterSignalSonore(); };
      $('btnTest').onclick = actionTest;
      $('btnEvac').onclick = actionEvacuation;
      $('accesBtn').onclick = basculerAcces;
      $('accesValider').onclick = validerAcces;
      $('accesAnnuler').onclick = function () { $('modalAcces').classList.remove('active'); };
      $('modalAcces').addEventListener('click', function (e) { if (e.target === this) this.classList.remove('active'); });
      $('accesCode').addEventListener('keydown', function (e) { if (e.key === 'Enter') validerAcces(); });
      $('btnAide').onclick = function () { $('aideModal').classList.add('active'); };
      $('aideClose').onclick = function () { $('aideModal').classList.remove('active'); };
      $('aideModal').addEventListener('click', function (e) { if (e.target === this) this.classList.remove('active'); });
      $('bilanClose').onclick = function () { $('bilanOverlay').classList.remove('active'); };
      $('bilanOverlay').addEventListener('click', function (e) { if (e.target === this) this.classList.remove('active'); });
      $('scenarioSelect').onchange = chargerScenarioDoc;
      $('btnDemarrer').onclick = demarrerScenario;
      $('btnPause').onclick = pauseScenario;
      $('btnStop').onclick = stopScenario;
      $('btnImprimer').onclick = function () { poste.imprimerFiche(); };
      $('btnTelecharger').onclick = function () { poste.telechargerFiche(); };
      $('palierSelect').querySelectorAll('button').forEach(function (b) {
        b.onclick = function () { setPalier(b.getAttribute('data-mode')); };
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { $('aideModal').classList.remove('active'); $('bilanOverlay').classList.remove('active'); $('modalAcces').classList.remove('active'); }
      });

      engine.onEvent(function (event, data) {
        if (event === 'journal') addJournalEntry(data);
        if (event === 'action') poste.notifierAction(data.action, data);
        if (event === 'refus' && data && data.reason === 'zone_en_alarme') {
          showToast('⛔ Réarmement impossible : une zone est encore en alarme. Traitez d\'abord l\'origine avant de réarmer.', 'error');
        }
        if (event === 'son') {
          audio.resume();
          if (data.type === 'alarme') audio.alarmeRestreinte();
          else if (data.type === 'evacuation') { audio.stop('alarme'); audio.evacuation(); }
          else if (data.type === 'derangement') audio.derangement();
          else if (data.type === 'stop') audio.stopAll();
        }
        refreshUI();
      });

      setInterval(function () {
        if (engine.getState() === 'VEILLE_NORMALE' && !testMode) { var l = $('lcd-line4'); if (l) l.textContent = padLCD(nowHeure()); }
      }, 1000);
    }

    // ============================================================ Zones & DAS (data-driven)
    function buildZones() {
      var grid = $('zonesGrid');
      grid.innerHTML = engine.getZones().map(function (z) {
        return '<div class="zone-card"><div class="zone-card-label">' + esc(z.id) + ' &mdash; ' + esc(zoneNoms[z.id] || '') + '</div>' +
          '<div class="zone-leds">' +
            zled(z.id, 'alarme', 'led-red', 'Alarme') + zled(z.id, 'derang', 'led-yellow', 'D&eacute;r.') + zled(z.id, 'hs', 'led-yellow', 'H.S.') +
          '</div><button class="btn-acquit-zone" data-zone="' + esc(z.id) + '">Acquit Zone</button></div>';
      }).join('');
      grid.querySelectorAll('.btn-acquit-zone').forEach(function (b) {
        b.onclick = function () { audio.resume(); audio.click(); engine.acquitterZone(this.getAttribute('data-zone')); refreshUI(); };
      });
    }
    function zled(id, suf, cls, label) { return '<div class="zone-led-group"><div class="led ' + cls + '" id="zled-' + id + '-' + suf + '"></div><span class="zone-led-label">' + label + '</span></div>'; }

    function buildDAS() {
      var das = engine.getDAS();
      var sec = $('dasSection');
      if (!das.length) { sec.style.display = 'none'; return; }
      sec.style.display = '';
      $('dasRows').innerHTML = das.map(function (d) {
        return '<div class="das-row veille" id="das-row-' + esc(d.id) + '"><span class="das-led"></span>' +
          '<span class="das-nom">' + esc(d.designation || d.id) + '</span><span class="das-type">' + esc(d.type || '') + '</span>' +
          '<span class="das-etat">veille</span></div>';
      }).join('');
    }

    function updateDAS() {
      engine.getDAS().forEach(function (d) {
        var row = $('das-row-' + d.id); if (!row) return;
        var st = d.etat === 'COMMANDE' ? 'commande' : d.etat === 'DEFAILLANT' ? 'defaillant' : 'veille';
        row.className = 'das-row ' + st;
        var lbl = st === 'commande' ? 'commandé' : st === 'defaillant' ? 'défaillant' : 'veille';
        row.querySelector('.das-etat').textContent = lbl;
      });
    }

    // ============================================================ Affichage état
    function updateLCD() {
      var st = engine.getState();
      var l1 = $('lcd-line1'), l2 = $('lcd-line2'), l3 = $('lcd-line3'), l4 = $('lcd-line4');
      l1.classList.remove('blink-text');
      if (testMode) { l1.textContent = padLCD('TEST SIGNALISATION'); l2.textContent = padLCD('TOUTES ZONES OK'); l3.textContent = padLCD('VOYANTS EN TEST'); l4.textContent = padLCD(nowHeure()); return; }
      if (st === 'VEILLE_NORMALE') { l1.textContent = padLCD('VEILLE NORMALE'); l2.textContent = padLCD('--------------------'); l3.textContent = padLCD('SYSTEME OPERATIONNEL'); l4.textContent = padLCD(nowHeure()); return; }
      if (st === 'EVACUATION') { l1.textContent = padLCD('!! EVACUATION !!'); l1.classList.add('blink-text'); l2.textContent = padLCD('TOUTES ZONES'); l3.textContent = padLCD('QUITTER BATIMENT'); l4.textContent = padLCD(nowHeure() + ' URGENCE'); return; }
      // Alarmes
      l1.textContent = padLCD(st === 'ALARME_RESTREINTE' ? 'ALARME FEU' : 'ALARME GENERALE'); l1.classList.add('blink-text');
      var za = engine.getZones().filter(function (z) { return z.alarme; });
      if (za.length) { l2.textContent = padLCD(za[0].id + ' ' + (zoneNoms[za[0].id] || '')); var j = engine.getJournal().find(function (e) { return e.type === 'ALARME' && e.zone === za[0].id; }); l3.textContent = padLCD((j && j.detail ? j.detail : 'DETECTEUR').toUpperCase()); }
      else { l2.textContent = padLCD('--------------------'); l3.textContent = padLCD('DETECTEUR'); }
      l4.textContent = padLCD(nowHeure() + ' ' + (engine.acquitte ? 'ACQUITTE' : 'ACQUITTER?'));
    }

    function updateGeneralLEDs() {
      var st = engine.getState(), zs = engine.getZones();
      var hasDer = zs.some(function (z) { return z.derangement; }), hasHS = zs.some(function (z) { return z.horsService; });
      set('led-alarmeFeu', 'led led-red' + (testMode ? ' on' : st !== 'VEILLE_NORMALE' ? ' blink' : ''));
      set('led-derangement', 'led led-yellow' + (testMode ? ' on' : hasDer ? ' blink' : ''));
      set('led-horsService', 'led led-yellow' + (testMode || hasHS ? ' on' : ''));
      set('led-essais', 'led led-yellow' + (testMode ? ' on' : ''));
    }
    function set(id, cls) { var e = $(id); if (e) e.className = cls; }

    function updateZoneLEDs() {
      engine.getZones().forEach(function (z) {
        var a = $('zled-' + z.id + '-alarme'), d = $('zled-' + z.id + '-derang'), h = $('zled-' + z.id + '-hs');
        if (!a) return;
        a.className = 'led led-red' + (testMode ? ' on' : z.alarme ? (z.acquittee ? ' on' : ' blink') : '');
        d.className = 'led led-yellow' + (testMode ? ' on' : z.derangement ? ' blink' : '');
        h.className = 'led led-yellow' + (testMode || z.horsService ? ' on' : '');
      });
    }

    function updateScoring() {
      var sc = player.getScoring(), ok = 0, ret = 0, man = 0;
      sc.forEach(function (s) { if (s.resultat === 'OK') ok++; else if (s.resultat === 'RETARD') ret++; else if (s.resultat === 'MANQUE') man++; });
      $('scoreOk').textContent = ok; $('scoreRetard').textContent = ret; $('scoreManque').textContent = man;
      var t = player.getScoreTotal(), f = $('scoringFill');
      f.style.width = Math.max(t.pct, 5) + '%'; f.textContent = t.pct + '%';
      f.className = 'scoring-fill ' + (t.pct >= 70 ? 'good' : t.pct >= 40 ? 'medium' : 'bad');
    }

    function addJournalEntry(entry) {
      var list = $('journalList'); var div = document.createElement('div');
      var t = (entry.type || '').toLowerCase(); var cls = 'journal-entry';
      if (t.indexOf('alarme') > -1) cls += ' alarme'; else if (t.indexOf('acquit') > -1) cls += ' acquittement';
      else if (t.indexOf('info') > -1) cls += ' info'; else if (t.indexOf('transition') > -1) cls += ' transition';
      else if (t.indexOf('derang') > -1) cls += ' derangement'; else if (t.indexOf('evacuation') > -1) cls += ' evacuation';
      else if (t.indexOf('rearm') > -1) cls += ' rearmement'; else if (t.indexOf('commande') > -1) cls += ' commande';
      else if (t.indexOf('defaill') > -1 || t.indexOf('refus') > -1) cls += ' defaillance';
      div.className = cls;
      var zt = entry.zone ? (' ' + entry.zone + ' — ' + (zoneNoms[entry.zone] || '')) : '';
      div.innerHTML = '<span class="time">' + (entry.time || nowHeure()) + '</span> — ' + esc(entry.message) + zt;
      if (list.firstChild) list.insertBefore(div, list.firstChild); else list.appendChild(div);
      while (list.children.length > 100) list.removeChild(list.lastChild);
    }

    function refreshUI() { updateLCD(); updateGeneralLEDs(); updateZoneLEDs(); updateDAS(); updateScoring(); }

    // ============================================================ Niveau d'accès
    function majAccesUI() {
      var pad = $('accesPad'), txt = $('accesNivTxt'), btn = $('accesBtn'), evac = $('btnEvac'), cad = $('evacCad');
      if (niveauAcces === 2) { pad.classList.add('niv2'); txt.innerHTML = 'NIV.2 &mdash; PERSONNEL FORM&Eacute;'; btn.innerHTML = '↩ Repasser Niv.1'; evac.classList.remove('verrou'); cad.innerHTML = '⚠'; }
      else { pad.classList.remove('niv2'); txt.innerHTML = 'NIV.1 &mdash; EXPLOITATION'; btn.innerHTML = '🔑 PASSER NIV.2'; evac.classList.add('verrou'); cad.innerHTML = '🔒'; }
    }
    function ouvrirModaleAcces(msg) {
      $('accesMsg').textContent = msg || 'Saisissez le code d\'accès niveau 2.';
      $('accesErr').textContent = ''; $('accesCode').value = '';
      $('modalAcces').classList.add('active'); setTimeout(function () { $('accesCode').focus(); }, 60);
    }
    function basculerAcces() { if (niveauAcces === 2) { niveauAcces = 1; majAccesUI(); } else ouvrirModaleAcces(); }
    function validerAcces() {
      if ($('accesCode').value === ACCES_CODE) { niveauAcces = 2; $('modalAcces').classList.remove('active'); majAccesUI(); }
      else { $('accesErr').textContent = 'Code incorrect.'; $('accesCode').value = ''; $('accesCode').focus(); }
    }

    // ============================================================ Actions équipement
    function actionTest() {
      audio.resume(); audio.click();
      if (engine.getState() !== 'VEILLE_NORMALE') return;
      testMode = true; engine.testSignalisation(); refreshUI();
      if (testTimeout) clearTimeout(testTimeout);
      testTimeout = setTimeout(function () { testMode = false; refreshUI(); }, 5000);
    }
    function actionEvacuation() {
      audio.resume(); audio.click();
      if (niveauAcces !== 2) { ouvrirModaleAcces('Accès niveau 2 requis pour l\'évacuation générale.'); return; }
      engine.evacuationGenerale();
    }

    // ============================================================ Profil & référentiels
    function chargerReferentiels() {
      fetch('referentiels/competences_ssiap1.json').then(function (r) { return r.json(); }).then(function (j) {
        (j.competences || []).forEach(function (c) { REFERENTIEL_COMP[c.id] = { libelle: c.libelle, bareme: c.bareme }; });
        evaluation = new Evaluation({ referentiel: REFERENTIEL_COMP });
      }).catch(function () {});
      fetch('referentiels/diplomes-securite.json').then(function (r) { return r.json(); }).then(function (j) {
        DIPLOMES_INFO = j.diplomes || []; remplirSelectDiplome(); majPerimetre();
      }).catch(function () {});
    }
    function remplirSelectDiplome() {
      var sel = $('profDiplome'); if (!sel) return; sel.innerHTML = '';
      DIPLOMES_INFO.forEach(function (d) { var o = document.createElement('option'); o.value = d.code; o.textContent = d.intitule; sel.appendChild(o); });
      sel.value = profil.diplome;
    }
    function getDiplomeInfo() { return DIPLOMES_INFO.find(function (d) { return d.code === profil.diplome; }) || { code: profil.diplome, intitule: profil.diplome, note_sur_20: 'defendable' }; }
    function formatMC() { return profil.diplome === 'CAP_AS' ? 'allege' : 'complet'; }
    function majPerimetre() {
      var el = $('profPerimetre'); if (!el) return; var d = getDiplomeInfo();
      var mode = d.note_sur_20 === 'indicatif' ? 'note /20 indicative' : d.note_sur_20 === 'entrainement' ? "score d'entraînement" : 'note /20';
      el.innerHTML = '⚠ Évaluation de la <b>composante sécurité incendie</b> uniquement (' + mode + ') — indicateur pédagogique, non certificatif.';
    }
    function initProfilUI() {
      var n = $('profNom'), c = $('profClasse'), d = $('profDiplome');
      n.value = profil.nom; n.addEventListener('input', function () { profil.set(this.value, undefined, undefined); });
      c.value = profil.classe; c.addEventListener('input', function () { profil.set(undefined, this.value, undefined); });
      d.addEventListener('change', function () { profil.set(undefined, undefined, this.value); majPerimetre(); filtrerScenarios(); if (scenarioCourant) poste.setFormatMainCourante(formatMC()); });
    }

    // ============================================================ Scénarios
    function remplirSelectScenario() {
      var sel = $('scenarioSelect');
      (config.scenarios || []).forEach(function (s) {
        var o = document.createElement('option'); o.value = s.value; o.textContent = s.label;
        o.setAttribute('data-diplomes', (s.diplomes || []).join(','));
        sel.appendChild(o);
      });
    }

    // Filtre le sélecteur de scénarios selon le diplôme suivi par l'élève.
    function filtrerScenarios() {
      var sel = $('scenarioSelect'); if (!sel) return;
      var dip = profil.diplome; var visibles = 0;
      Array.prototype.forEach.call(sel.options, function (o) {
        if (!o.value) return;
        var dl = (o.getAttribute('data-diplomes') || '').split(',').filter(Boolean);
        var ok = !dl.length || dl.indexOf(dip) > -1;
        o.hidden = !ok; o.disabled = !ok;
        if (ok) visibles++;
      });
      if (sel.value && sel.selectedOptions[0] && sel.selectedOptions[0].hidden) { sel.value = ''; chargerScenarioDoc(); }
      var av = $('scenAvert'); if (av) av.style.display = visibles ? 'none' : 'block';
    }
    function chargerScenarioDoc() {
      var sel = $('scenarioSelect').value;
      if (!sel) { scenarioCourant = null; $('btnDemarrer').disabled = true; $('btnImprimer').disabled = true; $('btnTelecharger').disabled = true; return; }
      fetch('scenarios/' + sel + '.json').then(function (r) { if (!r.ok) throw new Error('introuvable'); return r.json(); }).then(function (sc) {
        scenarioCourant = sc;
        zoneNoms = {}; (sc.zones || []).forEach(function (z) { zoneNoms[z.id] = z.nom; });
        engine.zones.clear(); engine.das.clear();
        engine.initZones(sc.zones || []); engine.initDAS(sc.das || []);
        stopScenarioState(); engine.reset();
        niveauAcces = 1; majAccesUI();
        buildZones(); buildDAS();
        $('journalList').innerHTML = '<div class="journal-entry info"><span class="time">' + nowHeure() + '</span> — Scénario chargé : ' + esc(sc.titre) + '. Prêt à démarrer.</div>';
        $('scenarioBadge').textContent = sc.titre; $('scenarioBadge').classList.remove('active'); $('chronoDisplay').textContent = '00:00';
        poste.charger(sc, modeActuel, formatMC());
        $('btnDemarrer').disabled = false; $('btnImprimer').disabled = false; $('btnTelecharger').disabled = false;
        refreshUI();
      }).catch(function (err) { alert('Erreur de chargement du scénario : ' + err.message); });
    }
    function demarrerScenario() {
      if (!scenarioCourant) { alert('Veuillez sélectionner un scénario.'); return; }
      audio.resume();
      player.charger(scenarioCourant); poste.charger(scenarioCourant, modeActuel, formatMC());
      $('journalList').innerHTML = ''; $('scenarioBadge').classList.add('active');
      $('btnDemarrer').style.display = 'none'; $('btnPause').style.display = 'inline-block'; $('btnStop').style.display = 'inline-block';
      bilanAffiche = false;
      player.onTick = function (e) { $('chronoDisplay').textContent = String(Math.floor(e / 60)).padStart(2, '0') + ':' + String(e % 60).padStart(2, '0'); };
      player.onScore = function (s) { updateScoring(); if (s.fin) finScenario(); };
      player.onEvent = function () {};
      player.demarrer(); refreshUI();
    }
    function pauseScenario() {
      if (player.paused) { player.reprendre(); $('btnPause').innerHTML = '&#10074;&#10074; Pause'; }
      else { player.pause(); $('btnPause').innerHTML = '&#9654; Reprendre'; }
    }
    function stopScenarioState() {
      $('btnDemarrer').style.display = 'inline-block'; $('btnPause').style.display = 'none'; $('btnStop').style.display = 'none';
    }
    function stopScenario() {
      audio.stopAll(); $('scenarioBadge').textContent = 'Terminé'; $('scenarioBadge').classList.remove('active');
      player._finScenario();
    }
    function finScenario() { if (bilanAffiche) return; bilanAffiche = true; stopScenarioState(); showBilan(player.getBilan()); }
    function setPalier(mode) {
      modeActuel = mode;
      $('palierSelect').querySelectorAll('button').forEach(function (b) { b.classList.toggle('actif', b.getAttribute('data-mode') === mode); });
      poste.setMode(mode);
    }

    // ============================================================ Bilan + export
    function showBilan(bilan) {
      var ev = evaluation.evaluer(bilan, scenarioCourant, getDiplomeInfo());
      global._dernierBilan = bilan; global._derniereEval = ev;
      var cls = ev.noteFinale >= 14 ? 'good' : ev.noteFinale >= 10 ? 'medium' : 'bad';
      var h = '<p style="text-align:center;color:#666;font-size:0.85em">' + (profil.nom ? esc(profil.nom) : 'Élève') + (profil.classe ? ' — ' + esc(profil.classe) : '') + ' · ' + esc(ev.diplome) + '</p>';
      h += '<div class="score-big ' + cls + '">' + fmtNote(ev.noteFinale) + ' / 20</div>';
      h += '<p style="text-align:center;color:#888;font-size:0.8em">' + esc(ev.etiquetteNote) + ' · ' + ev.pct + '% des points · durée ' + bilan.duree + ' s</p>';
      if (ev.plafonnee) h += '<p style="text-align:center;color:#c62828;font-size:0.82em;font-weight:bold">Note plafonnée en raison d\'une faute grave.</p>';
      if (ev.fautes.length) { h += '<div style="background:#ffebee;border-left:4px solid #c62828;padding:10px 14px;margin:10px 0;border-radius:6px;font-size:0.85em"><strong>⛔ Faute(s) grave(s) :</strong><ul style="margin:6px 0 0 18px">'; ev.fautes.forEach(function (f) { h += '<li>' + esc(f) + '</li>'; }); h += '</ul></div>'; }
      if (ev.competences.length) {
        h += '<h3 style="font-family:\'Trebuchet MS\',sans-serif;font-size:0.95em;color:#1b3a63;margin:14px 0 8px">Positionnement par compétence</h3>';
        ev.competences.forEach(function (c) {
          var largeur = c.evaluee ? Math.max(c.pct, 4) : 100;
          var fond = c.evaluee ? c.couleur : '#dfe3e9';
          h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;font-size:0.82em"><span style="width:46px;flex-shrink:0"><b>' + esc(c.code) + '</b></span>' +
            '<div style="flex:1;background:#e8ecf2;border-radius:9px;height:16px;overflow:hidden"><div style="width:' + largeur + '%;height:100%;background:' + fond + '"></div></div>' +
            '<span style="width:120px;flex-shrink:0;color:' + c.couleur + ';font-weight:bold;text-align:right;font-size:0.86em">' + c.picto + ' ' + c.niveau_label + '</span></div>' +
            '<div style="font-size:0.72em;color:#888;margin:0 0 8px 54px">' + esc(c.libelle) + (c.evaluee ? ' (' + c.pct + '%)' : '') + '</div>';
        });
      }
      if (bilan.details.length) {
        h += '<h3 style="font-family:\'Trebuchet MS\',sans-serif;font-size:0.95em;color:#1b3a63;margin:14px 0 8px">Détail des actions</h3><table><thead><tr><th>Action</th><th>Résultat</th><th>Temps</th><th>Points</th></tr></thead><tbody>';
        bilan.details.forEach(function (d) { var color = d.resultat === 'OK' ? '#2e7d32' : d.resultat === 'RETARD' ? '#ef6c00' : '#c62828'; var lib = (typeof LIB_ACTIONS !== 'undefined' && LIB_ACTIONS[d.action]) ? LIB_ACTIONS[d.action] : d.action; h += '<tr><td>' + esc(lib) + '</td><td style="color:' + color + ';font-weight:bold">' + d.resultat + '</td><td>' + d.realise + '</td><td>' + d.points + '/' + d.max + '</td></tr>'; });
        h += '</tbody></table>';
      }
      if (scenarioCourant && scenarioCourant.points_cles && scenarioCourant.points_cles.length) { h += '<div class="points-cles"><strong>À retenir :</strong><ul>'; scenarioCourant.points_cles.forEach(function (p) { h += '<li>' + esc(p) + '</li>'; }); h += '</ul></div>'; }
      h += '<h3 style="font-family:\'Trebuchet MS\',sans-serif;font-size:0.95em;color:#1b3a63;margin:14px 0 6px">Observations du formateur</h3><textarea id="bilanObs" placeholder="Appréciation, remédiation…" style="width:100%;min-height:60px;border:1px solid #dde2ea;border-radius:6px;padding:8px;font-family:Calibri,sans-serif;font-size:0.85em;box-sizing:border-box"></textarea>';
      h += '<p style="font-size:0.72em;color:#888;margin-top:10px;font-style:italic">' + esc(ev.perimetre) + '</p>';
      h += '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:14px"><button class="pe-btn pe-btn-primary" id="bilanImprimer">🖨 Imprimer / PDF</button><button class="pe-btn pe-btn-ghost" id="bilanTelecharger">⬇ Télécharger (HTML)</button><button class="pe-btn pe-btn-ghost" id="bilanJeton" title="Fichier à remettre au professeur pour le tableau de bord">🎫 Jeton pour le prof</button></div>';
      $('bilanContent').innerHTML = h;
      $('bilanImprimer').onclick = function () { imprimerBilan(); };
      $('bilanTelecharger').onclick = function () { telechargerBilan(); };
      $('bilanJeton').onclick = function () { genererJeton(); };
      $('bilanOverlay').classList.add('active');
    }

    function genererBilanHTML() {
      var bilan = global._dernierBilan, ev = global._derniereEval; if (!bilan || !ev) return '';
      var obsEl = $('bilanObs'); var obs = obsEl ? obsEl.value.trim() : '';
      var mc = poste.getMainCourante(); var reps = poste.getReponses();
      var now = new Date(); var dateStr = now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      var sc = scenarioCourant || {};
      var h = '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Bilan — ' + esc(sc.titre || '') + '</title><style>';
      h += 'body{font-family:Calibri,Arial,sans-serif;color:#1b1b1b;font-size:12pt;line-height:1.45;max-width:820px;margin:18px auto;padding:0 16px}h1{font-size:1.3em;color:#1b3a63}h2{font-size:1em;color:#1b3a63;border-bottom:2px solid #ff6b35;padding-bottom:3px;margin:16px 0 8px}';
      h += '.ident{display:flex;gap:18px;flex-wrap:wrap;font-size:0.9em;margin:8px 0;border:1px solid #ccc;padding:8px 12px;border-radius:6px}.ident span{flex:1;min-width:150px}.note{font-size:2.1em;font-weight:bold;text-align:center;margin:8px 0}';
      h += '.faute{background:#ffebee;border-left:4px solid #c62828;padding:8px 12px;margin:8px 0}table{width:100%;border-collapse:collapse;font-size:0.9em;margin-top:4px}th,td{border:1px solid #999;padding:5px 8px;text-align:left}th{background:#1b3a63;color:#fff}';
      h += '.bar{display:inline-block;width:110px;height:12px;background:#e8ecf2;border-radius:6px;overflow:hidden;vertical-align:middle}.bar>i{display:block;height:100%}.obs{border:1px solid #999;border-radius:6px;min-height:60px;padding:8px;white-space:pre-wrap}.peri{font-size:0.75em;color:#666;font-style:italic;margin-top:14px}@media print{body{margin:0}}';
      h += '</style></head><body><h1>SSI Trainer — Bilan d\'évaluation</h1><div style="font-size:0.95em;color:#444"><b>' + esc(sc.titre || '') + '</b>' + (sc.erp_type ? ' — ERP type ' + esc(sc.erp_type) : '') + '</div>';
      h += '<div class="ident"><span>Élève : <b>' + esc(profil.nom || '—') + '</b></span><span>Classe : ' + esc(profil.classe || '—') + '</span><span>Diplôme : ' + esc(ev.diplome) + '</span><span>Date : ' + esc(dateStr) + '</span></div>';
      var noteCol = ev.noteFinale >= 14 ? '#2e7d32' : ev.noteFinale >= 10 ? '#ef6c00' : '#c62828';
      h += '<h2>Résultat</h2><div class="note" style="color:' + noteCol + '">' + fmtNote(ev.noteFinale) + ' / 20</div><p style="text-align:center;color:#666;font-size:0.85em">' + esc(ev.etiquetteNote) + ' · ' + ev.pct + '% · durée ' + bilan.duree + ' s</p>';
      if (ev.plafonnee) h += '<p style="text-align:center;color:#c62828;font-weight:bold">Note plafonnée (faute grave).</p>';
      if (ev.fautes.length) { h += '<div class="faute"><b>Faute(s) grave(s) :</b><ul style="margin:4px 0 0 16px">'; ev.fautes.forEach(function (f) { h += '<li>' + esc(f) + '</li>'; }); h += '</ul></div>'; }
      if (ev.competences.length) { h += '<h2>Positionnement par compétence</h2><table><thead><tr><th>Compétence</th><th>Niveau</th><th>%</th></tr></thead><tbody>'; ev.competences.forEach(function (c) { var pctTxt = c.evaluee ? ('<span class="bar"><i style="width:' + Math.max(c.pct, 4) + '%;background:' + c.couleur + '"></i></span> ' + c.pct + '%') : '<span style="color:#9aa3af">—</span>'; h += '<tr><td><b>' + esc(c.code) + '</b> — ' + esc(c.libelle) + '</td><td style="color:' + c.couleur + ';font-weight:bold">' + c.picto + ' ' + c.niveau_label + '</td><td>' + pctTxt + '</td></tr>'; }); h += '</tbody></table>'; }
      if (bilan.details.length) { h += '<h2>Détail des actions</h2><table><thead><tr><th>Action</th><th>Résultat</th><th>Temps</th><th>Points</th></tr></thead><tbody>'; bilan.details.forEach(function (d) { var lib = (typeof LIB_ACTIONS !== 'undefined' && LIB_ACTIONS[d.action]) ? LIB_ACTIONS[d.action] : d.action; h += '<tr><td>' + esc(lib) + '</td><td>' + esc(d.resultat) + '</td><td>' + esc(d.realise) + '</td><td>' + d.points + '/' + d.max + '</td></tr>'; }); h += '</tbody></table>'; }
      if (mc.lignes && mc.lignes.length) { h += '<h2>Main courante de l\'élève</h2><table><thead><tr>'; mc.colonnes.forEach(function (c) { h += '<th>' + esc(c) + '</th>'; }); h += '</tr></thead><tbody>'; mc.lignes.forEach(function (row) { h += '<tr>'; row.forEach(function (v) { h += '<td>' + esc(v) + '</td>'; }); h += '</tr>'; }); h += '</tbody></table>'; }
      if (reps.length) { h += '<h2>Réponses aux questions</h2>'; reps.forEach(function (q, i) { h += '<p style="font-size:0.9em"><b>Q' + (i + 1) + '.</b> ' + esc(q.question) + '<br><span style="color:#1b3a63">→ ' + (esc(q.reponse) || '<i style="color:#999">(sans réponse)</i>') + '</span></p>'; }); }
      h += '<h2>Observations du formateur</h2><div class="obs">' + esc(obs) + '</div>';
      h += '<p class="peri">' + esc(ev.perimetre) + ' — Réf. ' + esc(getDiplomeInfo().rncp || '') + '. Généré par SSI Trainer (inerWeb Édu).</p></body></html>';
      return h;
    }
    function imprimerBilan() { var h = genererBilanHTML(); if (!h) return; var w = window.open('', '_blank'); if (!w) { alert('Autorisez les pop-up pour imprimer.'); return; } w.document.write(h); w.document.close(); w.onload = function () { w.focus(); w.print(); }; }
    function telechargerBilan() { var h = genererBilanHTML(); if (!h) return; var nom = 'bilan-ssi_' + (profil.nom ? profil.nom.replace(/\s+/g, '-') : 'eleve') + '_' + (scenarioCourant ? scenarioCourant.id : '') + '.html'; var b = new Blob([h], { type: 'text/html;charset=utf-8' }); var u = URL.createObjectURL(b); var a = document.createElement('a'); a.href = u; a.download = nom; a.click(); URL.revokeObjectURL(u); }
    function genererJeton() {
      var bilan = global._dernierBilan, ev = global._derniereEval;
      if (!bilan || !ev || typeof BilanJeton === 'undefined') { alert('Aucun bilan à exporter.'); return; }
      var obsEl = $('bilanObs');
      var jeton = BilanJeton.construireJeton(ev, {
        profil: profil, scenario: scenarioCourant, diplome: getDiplomeInfo(),
        genereLe: new Date().toISOString(), observations: obsEl ? obsEl.value.trim() : '', duree: bilan.duree
      });
      var nom = 'jeton-ssi_' + (profil.nom ? profil.nom.replace(/\s+/g, '-') : 'eleve') + '_' + (scenarioCourant ? scenarioCourant.id : 'scenario') + '.json';
      var b = new Blob([JSON.stringify(jeton, null, 2)], { type: 'application/json' });
      var u = URL.createObjectURL(b); var a = document.createElement('a'); a.href = u; a.download = nom; a.click(); URL.revokeObjectURL(u);
    }

    // ============================================================ Démarrage
    buildUI();
    remplirSelectScenario();
    filtrerScenarios();
    chargerReferentiels();
    initProfilUI();
    majAccesUI();
    refreshUI();
  }

  global.initSSINiveau = initSSINiveau;
})(window);
