// js/app.js - Главная логика приложения
window.App = {
    /**
     * Показать всю колоду
     */
    showDeck() {
        if (!this.deckReady()) return;
        try {
            UI.renderDeckGallery();
            this.scrollToResults();
        } catch (error) {
            console.error('Ошибка при отображении колоды:', error);
            alert('Произошла ошибка при загрузке колоды. Попробуйте обновить страницу.');
        }
    },

    /**
     * Выполнить расклад
     */
    doSpread(spreadKey) {
        if (!this.deckReady()) return;
        try {
            const config = Spreads.types[spreadKey];
            if (!config) {
                console.error(`Расклад "${spreadKey}" не найден`);
                return;
            }

            // Создаем колоду
            const fullDeck = Deck.create();
            if (!fullDeck || fullDeck.length === 0) {
                alert('Ошибка загрузки колоды. Проверьте консоль (F12).');
                return;
            }

            // Тянем карты
            const results = [];
            for (let i = 0; i < config.count; i++) {
                const cardData = Deck.draw(fullDeck);
                if (!cardData) {
                    console.error('Ошибка при вытягивании карты');
                    continue;
                }

                const orientation = cardData.reversed ? 'reversed' : 'direct';

                // Толкования берутся из карты: data/cards.json содержит
                // полный текст для всех 78 карт в обоих положениях.
                const meanings = cardData.meanings && cardData.meanings[orientation]
                    ? cardData.meanings[orientation]
                    : {};

                results.push({
                    name: cardData.name,
                    img: cardData.img,
                    orientation: orientation,
                    label: config.labels[i] || `Позиция ${i + 1}`,
                    general: meanings.general || "Описание отсутствует",
                    love: meanings.love || "Информация отсутствует",
                    work: meanings.work || "Информация отсутствует",
                    finance: meanings.finance || "Информация отсутствует",
                    health: meanings.health || "Информация отсутствует",
                    advice: meanings.advice || "Следуйте интуиции",
                    spreadName: config.title,
                    spreadKey: spreadKey,
                    date: Utils.formatDate()
                });
            }

            // Сохраняем в историю
            State.history.unshift({
                name: results[0].name,
                date: Utils.formatDate(),
                spreadName: config.title,
                spreadKey: spreadKey,
                cardsCount: results.length
            });

            // Ограничиваем историю 50 записями
            if (State.history.length > 50) {
                State.history = State.history.slice(0, 50);
            }

            HistoryStore.save();
            
            // Отображаем результаты
            UI.renderSpread(config.title, results, config);
            UI.renderHistory();
            
            // Скроллим к результатам
            this.scrollToResults();

        } catch (error) {
            console.error('Ошибка при выполнении расклада:', error);
            alert('Произошла ошибка. Попробуйте обновить страницу.');
        }
    },

    /**
     * Колода читается из data/cards.json асинхронно. Если по кнопке кликнули
     * раньше, чем она пришла, честнее сказать «ещё грузится», чем показывать
     * ошибку загрузки.
     */
    deckReady() {
        if (window.DeckLoader && DeckLoader.loaded) return true;
        alert(window.DeckLoader && DeckLoader.failed
            ? 'Колода не загрузилась: ' + DeckLoader.failed + '. Обновите страницу.'
            : 'Колода ещё загружается. Попробуйте через секунду.');
        return false;
    },

    /**
     * Очистить историю
     */
    clearHistory() {
        if (confirm('Вы уверены, что хотите очистить всю историю сеансов?')) {
            State.history = [];
            HistoryStore.save();
            UI.renderHistory();
        }
    },

    /**
     * Скроллинг к результатам
     */
    scrollToResults() {
        setTimeout(() => {
            const spreadContainer = document.getElementById('spread-container');
            if (spreadContainer) {
                spreadContainer.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }
        }, 300);
    },

    /**
     * Инициализация приложения
     */
    async init() {
        console.log('🔮 Tarot Professional System initialized');

        // История необязательна: что бы с ней ни случилось, колода должна
        // загрузиться. Поэтому её ошибки сюда не поднимаются.
        try {
            if (window.HistoryStore) HistoryStore.load();
            if (window.UI) UI.renderHistory();
        } catch (error) {
            console.warn('Не удалось восстановить историю:', error);
        }

        // Колода приходит из data/cards.json, то есть асинхронно:
        // до её загрузки расклады и галерея недоступны.
        try {
            await DeckLoader.load();
        } catch (error) {
            console.error('Не удалось загрузить колоду:', error);
            const container = document.getElementById('spread-container');
            if (container) {
                container.innerHTML =
                    '<p style="text-align: center; padding: 40px;">' +
                    'Не удалось загрузить data/cards.json. Проверьте консоль (F12).</p>';
            }
            return;
        }

        const testDeck = Deck.create();
        if (testDeck && testDeck.length === 78) {
            console.log('✅ Колода загружена корректно: 78 карт');
        } else {
            console.warn('⚠️ Проблема с загрузкой колоды. Карт:', testDeck ? testDeck.length : 0);
        }
    }
};

// Автоинициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
