document.querySelectorAll('[data-variant-group]').forEach((group) => {
  const tabs = [...group.querySelectorAll('[data-variant-tab]')];
  const panels = [...group.querySelectorAll('[data-variant]')];
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.variantTab;
      tabs.forEach((item) => item.setAttribute('aria-pressed', String(item === tab)));
      panels.forEach((panel) => panel.classList.toggle('active', panel.dataset.variant === target));
    });
  });
});

document.querySelectorAll('[data-selectable]').forEach((row) => {
  row.addEventListener('click', (event) => {
    if (event.target.closest('button')) return;
    row.classList.toggle('selected');
    const check = row.querySelector('.check');
    if (check) check.classList.toggle('on');
  });
});
