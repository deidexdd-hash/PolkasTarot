/* Author identity and a first-person introduction supplied by Ekaterina Belaya. */
window.Creator = {
    name: 'Екатерина Белая',
    greeting: [
        'Приветствую тебя, дорогой друг!',
        'Я хочу поделиться с тобой своими знаниями и опытом, которые объединила в книге «Карта как зеркало». На сайте материалы книги собраны в понятные уроки, вопросы и задания. Они помогут тебе познакомиться с языком карт, замечать собственные отклики и находить связь между образом и личным опытом.',
        'Не торопись искать единственно правильный ответ. Читай, наблюдай, пробуй и возвращайся к тому, что отозвалось. У каждого свой путь и свой темп.',
        'В добрый путь!'
    ],
    sections: [
        ['О себе — без витрины', [
            'Я не блогер. Всё самое ценное — при мне, и я это берегу. Я человек дела, и жить напоказ — не для меня. Но сегодняшний мир требует присутствия в интернете, поэтому здесь я понемногу рассказываю о себе: о семье, работе по найму и проектной работе, которая дала больше свободы выбора, о хобби и увлечениях.',
            'Мне важно, чтобы за материалами ты видела живого человека. Здесь я делюсь тем, что проживаю, изучаю и считаю ценным.'
        ]],
        ['Семь-я: то, что даёт опору', [
            'Я за семейственность. Глубина и ценность понятия «семь-я» раскрывались для меня с детства.',
            'Я росла в полной и любящей семье. Праздники и выходные — это много взрослых и детей, поездки в деревню и в гости, встречи с родственниками. Игры с братьями и сёстрами, бег по лужам под дождём вместе со взрослыми, общая работа по хозяйству — вплоть до нормативов по прополке картошки.',
            'Всё это осталось в памяти души как самые прекрасные моменты. Эти воспоминания дают мне энергию и сегодня.'
        ]],
        ['У каждого свой путь', [
            'Взрослея и проживая разные события, порой очень жёсткие, я спрашивала себя: для чего моя жизнь складывается именно так?',
            'Иногда я сравнивала себя с другими. Казалось, у кого-то всё счастливее и легче: в отношениях, семье, работе. Но внутри всегда звучал ответ — у каждого свой путь.',
            'Свой я начала чувствовать очень рано, примерно в три–пять лет, как бы неправдоподобно это ни звучало. В детстве у меня были переживания, которые я воспринимала как встречу с невидимым, и тонкая чувствительность к тому, что другие не решались произнести. Я боялась, что мне кажется, и иногда хотела спрятаться от происходящего.',
            'Мама была рядом, поддерживала меня и помогала принимать себя. Позже разные люди и события становились для меня проводниками. Я воспринимала эти встречи как подсказки Вселенной — училась не бояться себя, своей истинности и своих корней.'
        ]],
        ['Мои корни', [
            'Я общаюсь со старшими родственниками. Вместе нам удалось многое восстановить — и в памяти, и на деле. Для меня это глубже, чем нарисовать генограмму поколений: это живой разговор, узнавание и восстановление связей.',
            'Сегодня я чувствую, чьим преемником являюсь в родовой системе по маминой и папиной линиям. Я счастлива узнавать в себе то, что связываю с наследием моего рода.',
            'В нём были и есть творческие люди, которым хочется проявляться в мире; путешественники, открывающие новые горизонты; исследователи и практики, вносящие свой вклад в науку и жизнь страны; знахари, травники, маги и врачи от Бога; государственные служащие; торговцы и предприниматели, помогающие семье жить в достатке.',
            'И, конечно, люди, тонко чувствующие этот мир и стремящиеся сохранить знания для следующих поколений. У каждого — свои испытания. И это нормально.'
        ]],
        ['Зреть в корень', [
            'Разное предназначение, разные пути, практики и проводники — это разные инструменты и знания.',
            '«Зреть в корень» — это про меня. Родовая система здесь лишь часть целого. Мне важно понимать, с чего всё началось, как это называется и частью каких систем мы являемся. В моём личном мировоззрении есть место и разговору об энергиях.',
            'Корень, анализ, осознание истоков и последствий того, что есть в жизни сейчас, — во всех её сферах. Возвращение к внутреннему спокойствию и опоре. Вопросы «Кто я?» и «Кто за мной?».'
        ]],
        ['От сердца к сердцу', [
            'Мне близки люди, которые тонко чувствуют мир и воспринимают свою чувствительность, духовные или целительские знания как дар рода. Те, кто идёт путём принятия себя и хочет помогать другим от сердца к сердцу.',
            'Я постепенно делюсь своими шагами и действиями. Не всем сразу — тем, что готово стать частью нашего разговора.',
            'Все ответы в нас. Выход — в себя. Это пространство об этом.'
        ]]
    ],
    link(label = 'Екатерина Белая · об авторе') {
        const a = document.createElement('a');
        a.href = '#about=author'; a.className = 'creator-link'; a.textContent = label;
        a.onclick = event => { event.preventDefault(); this.open(); };
        return a;
    },
    byline(root, label = 'Автор книги и курса — Екатерина Белая') {
        if (!root || root.querySelector('.creator-byline')) return;
        const p = document.createElement('p'); p.className = 'creator-byline'; p.append(this.link(label));
        const hero = root.querySelector('.editorial-hero-copy');
        if (hero) hero.append(p); else root.prepend(p);
    },
    welcome(root) {
        if (!root || root.querySelector('.creator-welcome')) return;
        const panel = document.createElement('details'); panel.className = 'creator-welcome';
        const title = document.createElement('summary'); title.textContent = 'От автора курса · Екатерина Белая';
        panel.append(title);
        this.greeting.forEach(text => { const p = document.createElement('p'); p.textContent = text; panel.append(p); });
        const sign = document.createElement('p'); sign.className = 'creator-signature'; sign.textContent = 'С уважением, Екатерина Белая.';
        panel.append(sign, this.link('Познакомиться с автором →'));
        const hero = root.querySelector('.editorial-hero');
        if (hero) hero.after(panel); else root.prepend(panel);
    },
    open() {
        Book.track(); Book.current = null; Book.shell(); Home.closeMenu();
        try { history.replaceState(null, '', '#about=author'); } catch (_) {}
        const root = document.getElementById('bookContent');
        root.innerHTML = '<h2 class="book-title" tabindex="-1">Екатерина Белая</h2><p class="book-subtitle">Автор книги «Карта как зеркало» и курса по её материалам</p>';
        const article = document.createElement('article'); article.className = 'book-prose creator-prose';
        const intro = document.createElement('section');
        const h = document.createElement('h3'); h.textContent = 'От автора курса'; intro.append(h);
        this.greeting.forEach(text => { const p = document.createElement('p'); p.textContent = text; intro.append(p); });
        article.append(intro);
        this.sections.forEach(([title, paragraphs]) => {
            const section = document.createElement('section'), heading = document.createElement('h3'); heading.textContent = title; section.append(heading);
            paragraphs.forEach(text => { const p = document.createElement('p'); p.textContent = text; section.append(p); }); article.append(section);
        });
        const signature = document.createElement('p'); signature.className = 'creator-signature'; signature.textContent = 'С уважением, Екатерина Белая.'; article.append(signature);
        root.append(article);
        Personal.actions(root).append(Personal.button('Читать книгу', () => Book.open(), true), Personal.button('Перейти к урокам', () => Personal.course()));
        Editorial.decorate('book', {root, compact:true}); Book.focus();
    },
    init() {
        document.querySelectorAll('[data-creator-link]').forEach(el => {
            el.href = '#about=author'; el.onclick = event => { event.preventDefault(); this.open(); };
        });
        const menu = document.getElementById('homeMenu'); menu.querySelector('p').before(this.link('Об авторе · Екатерина Белая ↗'));
        Editorial.wrap(Book, 'contents', () => { const root = document.getElementById('bookContent'); this.byline(root); this.welcome(root); });
        Editorial.wrap(Book, 'chapter', () => this.byline(document.getElementById('bookContent')));
        Editorial.wrap(Book, 'practice', () => this.byline(document.getElementById('bookContent')));
        Editorial.wrap(Author, 'render', () => this.byline(document.getElementById('bookContent')));
        Editorial.wrap(Academy, 'home', () => { const root = document.querySelector('.academy'); this.byline(root); this.welcome(root); });
        for (const method of ['train','compare']) Editorial.wrap(Academy, method, () => this.byline(document.querySelector('.academy'), 'Автор курса — Екатерина Белая'));
        const course = Personal.course.bind(Personal);
        Personal.course = async (...args) => { await course(...args); if (document.getElementById('courseProgress')) this.byline(document.getElementById('bookContent')); };
        const init = App.init.bind(App);
        App.init = async (...args) => { const route = location.hash; await init(...args); if (route === '#about=author' && location.hash === route && !document.body.classList.contains('reading-active')) this.open(); };
    }
};
Creator.init();
