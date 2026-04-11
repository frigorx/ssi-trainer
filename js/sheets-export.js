/**
 * Export Google Sheets / CSV / PDF
 * inerWeb Édu — F. Henninot
 */

class SheetsExport {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl || '';
  }

  setWebhook(url) {
    this.webhookUrl = url;
  }

  async exportSheets(bilan) {
    if (!this.webhookUrl) {
      alert('URL webhook Google Apps Script non configurée.\nAllez dans Paramètres pour la configurer.');
      return false;
    }
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addBilan',
          date: new Date().toLocaleDateString('fr-FR'),
          heure: new Date().toLocaleTimeString('fr-FR'),
          ...bilan
        })
      });
      alert('Bilan envoyé vers Google Sheets !');
      return true;
    } catch (err) {
      alert('Erreur export Sheets : ' + err.message);
      return false;
    }
  }

  exportCSV(bilan) {
    const headers = ['Temps', 'Action', 'Compétence', 'Attendu', 'Réalisé', 'Points', 'Max', 'Résultat'];
    const rows = bilan.details.map(d => [
      d.realise, d.action, d.competence, d.attendu, d.realise, d.points, d.max, d.resultat
    ]);
    let csv = '\uFEFF'; // BOM UTF-8
    csv += headers.join(';') + '\n';
    rows.forEach(r => { csv += r.join(';') + '\n'; });
    csv += '\n';
    csv += `Scénario;${bilan.scenario}\n`;
    csv += `Niveau;${bilan.niveau}\n`;
    csv += `Durée;${bilan.duree}s\n`;
    csv += `Score;${bilan.score.points}/${bilan.score.max} (${bilan.score.pct}%)\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bilan_ssi_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  copyCSV(bilan) {
    const headers = ['Temps', 'Action', 'Compétence', 'Attendu', 'Réalisé', 'Points', 'Max', 'Résultat'];
    const rows = bilan.details.map(d => [
      d.realise, d.action, d.competence, d.attendu, d.realise, d.points, d.max, d.resultat
    ]);
    let csv = headers.join('\t') + '\n';
    rows.forEach(r => { csv += r.join('\t') + '\n'; });
    navigator.clipboard.writeText(csv).then(() => {
      alert('Bilan copié dans le presse-papier !');
    }).catch(() => {
      alert('Impossible de copier — utilisez le téléchargement CSV.');
    });
  }

  exportPDF() {
    window.print();
  }
}

if (typeof module !== 'undefined') module.exports = { SheetsExport };
