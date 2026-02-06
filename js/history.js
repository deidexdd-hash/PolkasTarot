// js/history.js
window.HistoryStore = (() => {
  const KEY = 'tarot-history';

  function load() {
    const data = localStorage.getItem(KEY);
    if (data && window.State) {
        State.history = JSON.parse(data);
    }
  }

  function save() {
    if (window.State) {
        localStorage.setItem(KEY, JSON.stringify(State.history));
    }
  }

  return { load, save };
})();