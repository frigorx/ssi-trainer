/**
 * Tests du moteur SSI — non-régression des deux bugs corrigés (27/06) :
 *  - auto-commande parasite des DAS (zone perdue à l'initDAS) ;
 *  - réarmement bloqué tant que la cause n'est pas levée (action « traiter la cause »).
 * Exécution :  node test/engine.test.js
 */
'use strict';
const assert = require('assert');
const { SSIEngine, SSIState } = require('../js/ssi-engine.js');

// --- initDAS conserve la zone d'asservissement ---
(function () {
  const e = new SSIEngine({ doubleKnock: true });
  e.initDAS([{ id: 'PCF-ESC-R1', designation: 'PCF', type: 'compartimentage', zone: 'Z06' }]);
  assert.strictEqual(e.getDAS()[0].zone, 'Z06', 'initDAS doit conserver la zone');
  e.destroy();
})();

// --- DAS d'une AUTRE zone que la zone sinistrée ne doit PAS être auto-commandé ---
(function () {
  const e = new SSIEngine({ doubleKnock: true });
  e.initZones([{ id: 'Z04', nom: 'Bureau' }, { id: 'Z06', nom: 'Escalier' }]);
  e.initDAS([{ id: 'PCF-ESC-R1', designation: 'PCF escalier', type: 'compartimentage', zone: 'Z06' }]);
  // double détection en Z04 -> alarme générale
  e.declencherAlarme('Z04'); e.declencherAlarme('Z04');
  assert.strictEqual(e.getState(), SSIState.ALARME_GENERALE, 'double détection -> alarme générale');
  assert.strictEqual(e.getDAS()[0].etat, 'VEILLE', 'la PCF Z06 ne doit PAS être auto-commandée (sinistre en Z04) — elle reste à la main de l\'élève');
  e.destroy();
})();

// --- DAS de la zone sinistrée, lui, est bien auto-commandé (asservissement réaliste) ---
(function () {
  const e = new SSIEngine({ doubleKnock: true });
  e.initZones([{ id: 'Z04', nom: 'Bureau' }]);
  e.initDAS([{ id: 'CLAP-Z04', designation: 'Clapet bureau', type: 'compartimentage', zone: 'Z04' }]);
  e.declencherAlarme('Z04'); e.declencherAlarme('Z04');
  assert.strictEqual(e.getDAS()[0].etat, 'COMMANDE', 'le DAS de la zone sinistrée est bien commandé');
  e.destroy();
})();

// --- Réarmement refusé tant que la zone est en alarme ; leverCause débloque ---
(function () {
  const e = new SSIEngine({ doubleKnock: false });
  e.initZones([{ id: 'ZD01', nom: 'Cuisine' }]);
  e.declencherAlarme('ZD01');
  e.acquitter();                                   // acquittement général
  assert.strictEqual(e.rearmement(), false, 'réarmement refusé : zone encore en alarme');
  assert.strictEqual(e.getState(), SSIState.ALARME_RESTREINTE, 'toujours en alarme après refus');

  let refus = null;
  e.onEvent((ev, data) => { if (ev === 'refus') refus = data; });
  e.rearmement();
  assert.ok(refus && refus.reason === 'zone_en_alarme', 'le motif de refus est explicite (zone_en_alarme)');

  const traitees = e.leverCause();                 // « aérer / traiter la cause »
  assert.strictEqual(traitees, 1, 'leverCause traite la zone en alarme');
  assert.strictEqual(e.getZone('ZD01').alarme, false, 'la zone n\'est plus en alarme après traitement');
  assert.strictEqual(e.rearmement(), true, 'réarmement possible une fois la cause levée');
  assert.strictEqual(e.getState(), SSIState.VEILLE_NORMALE, 'retour en veille normale après réarmement');
  e.destroy();
})();

console.log('OK — moteur : DAS zone-exact (pas d\'auto-commande parasite) + réarmement gated par « traiter la cause ».');
