/* A daily practice is an ordinary diary snapshot, included in its backup. */
window.Daily = {
    open() {
        if (!App.deckReady()) return;
        const day = App.today();
        const index = State.history.findIndex(item => item.dailyPractice === true && item.day === day && item.spreadKey === 'daily' && Journal.validate(item));
        if (index >= 0) Journal.open(index);
        else App.doSpread('daily', {dailyPractice:true, day});
        this.select('daily');
    },
    select(key) {
        document.querySelectorAll('[data-section]').forEach(button => {
            if (button.dataset.section === key) button.setAttribute('aria-current','page');
            else button.removeAttribute('aria-current');
        });
    },
    journal() {
        UI.closeCard();
        this.select('journal');
        const target = document.getElementById('history-sidebar');
        target.setAttribute('tabindex','-1');
        target.focus({preventScroll:true});
        target.scrollIntoView({behavior:'smooth',block:'start'});
    },
    decorate(item) {
        if (!item.dailyPractice) return;
        const container = document.getElementById('spread-container');
        const banner = document.createElement('div');
        banner.className = 'daily-heading';
        banner.innerHTML = `<p class="eyebrow">МОЯ ЕЖЕДНЕВНАЯ ПРАКТИКА</p><p>${UI.escape(item.day)} · Одна карта на день</p><span>Вернитесь вечером, чтобы дополнить запись. Карта и заметки хранятся на этом устройстве и входят в экспорт дневника.</span>`;
        container.prepend(banner);
        const morning = container.querySelector('.first-look-panel h3');
        const evening = container.querySelector('.follow-up-panel h3');
        if (morning) morning.textContent = 'Утро · что я замечаю';
        if (evening) evening.textContent = 'Вечер · как прошёл день';
        const label = container.querySelector('label[for="followUpNote"]');
        if (label) label.textContent = 'Что произошло сегодня? Как теперь воспринимается карта?';
    }
};
const practiceEditor = Journal.showEditor.bind(Journal);
Journal.showEditor = function(item, saved) { practiceEditor(item,saved); Daily.decorate(item); };
const practiceView = App.setView.bind(App);
App.setView = function(key) { practiceView(key); Daily.select(['deck','academy','daily'].includes(key)?key:'home'); };
const practiceHome = App.showHome.bind(App);
App.showHome = function() { practiceHome(); Daily.select('home'); };
document.addEventListener('DOMContentLoaded',()=>Daily.select('home'));
// Keep the dock out of the way of the software keyboard.
if (window.visualViewport) {
    const syncKeyboard = () => document.body.classList.toggle('keyboard-open', window.innerHeight - window.visualViewport.height > 150);
    window.visualViewport.addEventListener('resize', syncKeyboard);
}
