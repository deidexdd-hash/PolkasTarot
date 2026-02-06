window.Utils = {
  shuffle(arr) {
    return [...arr].sort(() => Math.random() - 0.5);
  },

  formatDate(date = new Date()) {
    return date.toLocaleString('ru-RU');
  }
};
