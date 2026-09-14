/* Editorial home: presentation and navigation, using the existing practice flows. */
window.Home = {
    closeMenu(restoreFocus = false) {
        const panel = document.getElementById('homeMenu'), button = document.getElementById('homeMenuToggle');
        if (!panel || !button) return;
        panel.hidden = true; button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-label', 'Открыть меню');
        if (restoreFocus) button.focus();
    },
    toggleMenu() {
        const panel = document.getElementById('homeMenu'), button = document.getElementById('homeMenuToggle');
        if (!panel || !button) return;
        if (!panel.hidden) { this.closeMenu(true); return; }
        panel.hidden = false; button.setAttribute('aria-expanded', 'true');
        button.setAttribute('aria-label', 'Закрыть меню');
        panel.querySelector('button')?.focus();
    },
    go(target) {
        this.closeMenu();
        const routes = {layouts: () => SpreadLibrary.open(), deck: () => App.showDeck(),
            book: () => Book.open(), study: () => Academy.home(), journal: () => Daily.journal()};
        if (Object.hasOwn(routes, target)) routes[target]();
    },
    theme() {
        const color = '#f5f1e8';
        document.querySelectorAll('meta[name="theme-color"]').forEach(meta => meta.setAttribute('content', color));
    },
    icon(config) {
        const rows = config.areas.map(row => row.replace(/["']/g, '').trim().split(/\s+/));
        return `<svg viewBox="0 0 ${rows[0].length * 10} ${rows.length * 13}" aria-hidden="true" focusable="false">${rows.map((row,y) => row.map((cell,x) => cell === '.' ? '' : `<rect x="${x * 10 + 1}" y="${y * 13 + 1}" width="7" height="10" rx="1"/>`).join('')).join('')}</svg>`;
    },
    init() {
        this.theme();
        document.querySelectorAll('[data-home-count="spreads"]').forEach(el => { el.textContent = Object.keys(Spreads.types).length; });
        document.querySelectorAll('.spread-chip[data-spread]').forEach(button => {
            const config = Spreads.types[button.dataset.spread];
            if (!config || button.querySelector('.home-spread-symbol')) return;
            const symbol = document.createElement('span'); symbol.className = 'home-spread-symbol';
            symbol.innerHTML = this.icon(config); button.prepend(symbol);
        });
    }
};
const editorialHomeView = App.setView.bind(App);
App.setView = function(key) { editorialHomeView(key); Home.closeMenu(); Home.theme(); };
const editorialHomeShow = App.showHome.bind(App);
App.showHome = function() { editorialHomeShow(); Home.closeMenu(); Home.theme(); };
document.addEventListener('DOMContentLoaded', () => Home.init());
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !document.getElementById('homeMenu')?.hidden) { event.preventDefault(); Home.closeMenu(true); }
});
document.addEventListener('click', event => {
    if (!event.target.closest?.('.nav-bar')) Home.closeMenu();
});
document.addEventListener('focusin', event => {
    if (!event.target.closest?.('.nav-bar')) Home.closeMenu();
});
window.addEventListener('resize', () => { if (window.innerWidth > 699) Home.closeMenu(); });
