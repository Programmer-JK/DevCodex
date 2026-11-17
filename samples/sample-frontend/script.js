document.getElementById('theme-toggle').addEventListener('click', () => {
  document.body.classList.toggle('dark');
});
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
    document.querySelectorAll('.tab-panel').forEach((p) => { p.hidden = p.id !== 'panel-' + tab.dataset.tab; });
  });
});
document.querySelectorAll('.copy').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const status = btn.nextElementSibling;
    try {
      await navigator.clipboard.writeText(document.getElementById(btn.dataset.target).textContent);
      status.textContent = '복사됨';
    } catch (e) {
      status.textContent = '복사 실패: ' + e.name;
    }
  });
});
const acc = document.querySelector('.acc-toggle');
acc.addEventListener('click', () => {
  const body = document.getElementById(acc.getAttribute('aria-controls'));
  body.hidden = !body.hidden;
  acc.setAttribute('aria-expanded', String(!body.hidden));
});
