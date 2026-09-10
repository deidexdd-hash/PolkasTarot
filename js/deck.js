// js/deck.js
window.Deck = {
    /**
     * Собирает полную колоду из 78 карт
     */
    create(rng) {
        const db = window.TarotDB;

        // Собираем все части воедино
        const fullDeck = [
            ...db.major,
            ...db.minor.wands,
            ...db.minor.cups,
            ...db.minor.swords,
            ...db.minor.pentacles
        ];

        // Проверка: в полной колоде Таро Райдера-Уэйта должно быть 78 карт
        console.log(`Колода собрана. Всего карт: ${fullDeck.length}`);

        if (fullDeck.length === 0) {
            console.error("КРИТИЧЕСКАЯ ОШИБКА: Колода пуста! Проверьте, загружены ли файлы данных в index.html и нет ли в них ошибок.");
            alert("Ошибка загрузки данных. Проверьте консоль (F12).");
            return [];
        }

        // Перемешиваем и возвращаем. rng задаётся только для расклада по
        // вопросу, где карты обязаны повториться; обычная раздача берёт
        // числа из crypto.
        return window.Utils.shuffle(fullDeck, rng);
    },

    /**
     * Достает одну карту и определяет её ориентацию (прямая/перевернутая)
     */
    draw(deck, rng) {
        if (deck.length === 0) return null;

        const card = deck.pop();
        // 50% шанс на перевёрнутую карту. Через Utils, а не Math.random:
        // иначе положение карты не повторилось бы по ссылке, да и в обычной
        // раздаче источник случайности должен быть один и тот же.
        const isReversed = window.Utils.randomInt(2, rng) === 1;
        
        return { 
            ...card, 
            reversed: isReversed 
        };
    }
};