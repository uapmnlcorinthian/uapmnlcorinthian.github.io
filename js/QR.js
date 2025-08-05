(() => {
  const delay = 101;
  let timeout;

  const isVisible = id => document.getElementById(id)?.dataset.shown === '1';

  const generateVCardQR = () => {
    const u = JSON.parse(sessionStorage.getItem('userData') || '{}');
    if (!u?.ok) return;
    const pi = u.pi;
	const lines = [
	  'BEGIN:VCARD',
	  'VERSION:3.0',
	  `FN:${pi.n || ''}`,
	  `URL:https://uapmnlcorinthian.com`
	];

	// Conditionally add fields based on visibility
	if (isVisible('prcLicense'))   lines.push(`NOTE:PRC ${pi.prc || ''}`);
	if (isVisible('email'))        lines.push(`EMAIL:${pi.e || ''}`);
	if (isVisible('contactNo')) {
	  const c = String(pi.c || '').replace(/^0+/, '');
	  lines.push(`TEL:0${c}`);
	}
	if (isVisible('cardCompany'))  lines.push(`ORG:${pi.co || ''}`);
	if (isVisible('cardPosition')) lines.push(`TITLE:${pi.po || ''}`);

	// Add categories
	lines.push(`CATEGORIES:Architect,UAP,MCC`);
	lines.push('END:VCARD');

    const qr = document.getElementById('qr-vcard');
    if (!qr) return;
    qr.innerHTML = '';
    new QRCode(qr, {
      text: lines.join('\n'),
      width: 300,
      height: 300,
      correctLevel: QRCode.CorrectLevel.H
    });
  };

  // Attach debounced listeners to toggles
  ['prcLicense', 'email', 'contactNo', 'cardCompany', 'cardPosition'].forEach(id => {
    const toggle = document.getElementById(id)?.parentElement?.querySelector('.toggle-sensitive-btn');
    if (toggle) {
      toggle.addEventListener('click', () => {
        clearTimeout(timeout);
        timeout = setTimeout(generateVCardQR, delay);
      });
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(generateVCardQR, 500);
  });
})();
