// js/history.js
window.HistoryStore = (() => {
  const KEY = 'tarot-history';

  // localStorage доступен не всегда: приватный режим, запрет на данные сайта,
  // открытие страницы с диска. Обращение к нему тогда бросает исключение.
  // История — вещь необязательная, и ронять из-за неё загрузку колоды нельзя.
  function load() {
    try {
      const data = localStorage.getItem(KEY);
      if (data && window.State) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          State.history = parsed;
        }
      }
    } catch (error) {
      console.warn('История недоступна, продолжаем без неё:', error.message);
    }
  }

  function save() {
    if (!window.State) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(State.history));
    } catch (error) {
      console.warn('Не удалось сохранить историю:', error.message);
    }
  }

  return { load, save };
})();
