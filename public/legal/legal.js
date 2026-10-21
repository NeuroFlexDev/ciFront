'use strict';
document.querySelectorAll('[data-print]').forEach(button => button.addEventListener('click', () => window.print()));
const form = document.querySelector('#contact-form');
if (form) {
  const purpose = form.elements.namedItem('purpose');
  const consent = form.elements.namedItem('consent');
  const consentBox = document.querySelector('#contact-consent');
  const status = document.querySelector('#contact-status');
  // Explain a closed pilot before the visitor enters personal information.
  void fetch('/api/legal/catalog').then(async response => {
    if (!response.ok) return;
    const config = await response.json();
    if (config.contact_requests_enabled === false) {
      for (const element of form.elements) element.disabled = true;
      status.className = 'status'; status.hidden = false;
      status.textContent = 'Электронная форма в этом контуре пока не включена. Обращения принимаются по почтовому адресу, указанному выше.';
    }
  }).catch(() => { /* Submission still provides a retry and the postal alternative. */ });
  purpose.addEventListener('change', () => {
    consentBox.hidden = purpose.value !== 'enquiry';
    consent.required = purpose.value === 'enquiry';
    consent.checked = false;
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button[type=submit]');
    button.disabled = true; status.hidden = true;
    try {
      const payload = Object.fromEntries(new FormData(form));
      payload.consent = consent.checked;
      payload.legal_version = form.dataset.legalVersion;
      const response = await fetch('/api/legal/requests', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : 'Не удалось отправить обращение. Проверьте поля и попробуйте позже.');
      status.className = 'status';
      status.textContent = `Обращение принято. Сохраните номер: ${result.reference}. При необходимости мы уточним сведения по вашей почте.`;
      form.reset(); purpose.dispatchEvent(new Event('change'));
    } catch (error) {
      status.className = 'status error';
      status.textContent = error instanceof Error ? error.message : 'Сервис временно недоступен. Можно направить письмо по адресу, указанному выше.';
    } finally { button.disabled = false; status.hidden = false; }
  });
}
