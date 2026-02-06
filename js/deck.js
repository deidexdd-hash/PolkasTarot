// js/deck.js
window.Deck = {
    /**
     * Собирает полную колоду из 78 карт
     */
    create() {
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

        // Перемешиваем и возвращаем
        return window.Utils.shuffle(fullDeck);
    },

    /**
     * Достает одну карту и определяет её ориентацию (прямая/перевернутая)
     */
    draw(deck) {
        if (deck.length === 0) return null;
        
        const card = deck.pop();
        // 50% шанс на перевернутую карту
        const isReversed = Math.random() < 0.5;
        
        return { 
            ...card, 
            reversed: isReversed 
        };
    }
};