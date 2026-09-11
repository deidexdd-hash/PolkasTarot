// Preserve the original history key as a migration backup.
window.HistoryStore = (() => {
  const KEY = 'tarot-history-v2';
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      const data = JSON.parse(raw === null ? (localStorage.getItem('tarot-history') || '[]') : raw);
      if (!Array.isArray(data)) throw new Error('Неверный формат дневника');
      State.history = data.filter(x => x && typeof x === 'object');
    } catch (error) {
      console.warn('Дневник недоступен:', error.message);
      const el = document.getElementById('journalStatus');
      if (el) el.textContent = 'Не удалось прочитать дневник. Экспортируйте доступные записи перед очисткой данных браузера.';
    }
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(State.history));
      return true;
    } catch (error) {
      console.warn('Не удалось сохранить дневник:', error.message);
      const el = document.getElementById('journalStatus');
      if (el) el.textContent = 'Изменения только в этой вкладке: хранилище недоступно или заполнено. Сделайте экспорт.';
      return false;
    }
  }
  return {load, save};
})();
