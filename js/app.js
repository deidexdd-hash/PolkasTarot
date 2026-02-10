// js/app.js - Главная логика приложения
window.App = {
    /**
     * Показать всю колоду
     */
    showDeck() {
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
                
                // Получаем толкования
                const meanings = cardData.meanings && cardData.meanings[orientation] 
                    ? cardData.meanings[orientation] 
                    : {};
                
                // Проверяем расширенные интерпретации
                const fullInfo = (window.FullInterpretations && window.FullInterpretations[cardData.name]) 
                    ? window.FullInterpretations[cardData.name][orientation] 
                    : meanings;

                results.push({
                    name: cardData.name,
                    img: cardData.img,
                    orientation: orientation,
                    label: config.labels[i] || `Позиция ${i + 1}`,
                    general: fullInfo.general || meanings.general || "Описание отсутствует",
                    love: fullInfo.love || meanings.love || "Информация отсутствует",
                    work: fullInfo.work || meanings.work || "Информация отсутствует",
                    finance: fullInfo.finance || meanings.finance || "Информация отсутствует",
                    health: fullInfo.health || meanings.health || "Информация отсутствует",
                    advice: fullInfo.advice || meanings.advice || "Следуйте интуиции",
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
    init() {
        console.log('🔮 Tarot Professional System initialized');
        
        // Загружаем историю
        if (window.HistoryStore) {
            HistoryStore.load();
        }
        
        // Отображаем историю
        if (window.UI) {
            UI.renderHistory();
        }
        
        // Проверяем, загружена ли колода
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
