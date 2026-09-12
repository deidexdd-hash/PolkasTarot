/* Practical companion to the manuscript. Source content stays in book.json. */
window.Author = {
    data:null,pending:null,tab:'cards',request:0,
    e(value){return UI.escape(String(value??''));},
    tabs:{cards:'78 карт',lessons:'34 урока',lenormand:'Ленорман · 36',practices:'8 практик'},
    async load(){
        if(this.data)return this.data;
        if(!this.pending)this.pending=fetch('data/author-materials.json').then(r=>{if(!r.ok)throw Error('materials');return r.json();}).then(d=>{this.data=d;return d;}).finally(()=>{this.pending=null;});
        return this.pending;
    },
    async open(tab='cards',id=null){
        const token=++this.request;
        if(!Object.hasOwn(this.tabs,tab))tab='cards';
        Book.track();Book.current=null;Book.shell();
        const root=document.getElementById('bookContent');
        root.innerHTML='<p role="status">Открываем материалы…</p>';
        try{await this.load();if(token!==this.request||!root.isConnected)return;
            this.tab=tab;this.render(id);
        }catch(_){if(token===this.request&&root.isConnected)root.innerHTML='<h2>Не удалось открыть материалы</h2><p>Проверь соединение и попробуй ещё раз.</p><button class="primary-button" onclick="Author.open()">Повторить</button>';}
    },
    route(id){try{const p=new URLSearchParams({study:this.tab});if(id)p.set('id',id);history.replaceState(null,'','#'+p);}catch(_){}},
    render(id){
        const root=document.getElementById('bookContent');if(!root)return;
        const items=this.data[this.tab];const item=id?items.find(x=>(x.code||x.id)===String(id)):null;
        this.route(item?(item.code||item.id):null);
        root.innerHTML=`<button class="text-btn" onclick="Book.open()">← Читать книгу</button><p class="eyebrow">ДОПОЛНЕНИЕ К КНИГЕ</p><h2 class="book-title" tabindex="-1">Практическое продолжение</h2><nav class="author-tabs" aria-label="Авторские материалы">${Object.entries(this.tabs).map(([key,label])=>`<button class="text-btn" ${key===this.tab?'aria-current="page"':''} onclick="Author.open('${key}')">${label}</button>`).join('')}</nav><div id="authorBody"></div>`;
        if(item)this.detail(item);
        else this.list();
        Book.focus();
    },
    list(){
        document.getElementById('authorBody').innerHTML=`<p class="author-intro">${this.e(this.tab==='lenormand'?this.data.lenormandGuide:this.data.editorialNote)}</p>${this.tab==='cards'?`<details class="author-guide"><summary>Как пользоваться описаниями</summary><p>${this.e(this.data.readingGuide)}</p></details>`:''}<label for="authorSearch">Найти по названию или теме</label><input id="authorSearch" class="academy-input" type="search" placeholder="Например: границы, забота, выбор" oninput="Author.filter()">${this.tab==='cards'?`<label for="authorSuit">Часть колоды</label><select id="authorSuit" class="academy-input" onchange="Author.filter()"><option value="all">Все 78 карт</option><option value="major_arcana">Старшие арканы</option><option value="wands">Жезлы</option><option value="cups">Кубки</option><option value="swords">Мечи</option><option value="pentacles">Пентакли</option></select>`:''}<p id="authorCount" class="book-meta" role="status"></p><div id="authorResults"></div><details class="book-sources"><summary>О текстах и источниках</summary>${this.data.sources.map(s=>`<p><strong>${this.e(s.title)}</strong><br>${this.e(s.kind)}${s.url?` <a href="${this.e(s.url)}" target="_blank" rel="noopener noreferrer">Открыть источник</a>`:''}</p>`).join('')}</details>`;
        this.filter();
    },
    search(tab,query='',suit='all'){
        const q=String(query).toLocaleLowerCase('ru').replaceAll('ё','е').trim();
        return this.data[tab].filter(item=>{
            if(tab==='cards'&&suit!=='all'&&!item.code.split('.').includes(suit))return false;
            // Only visible prose participates; identifiers do not create noisy matches.
            const text=Object.entries(item).filter(([key])=>!['code','id','chapter','origin','pair','img'].includes(key)).map(([,v])=>typeof v==='string'?v:Array.isArray(v)?v.join(' '):'').join(' ');
            return text.toLocaleLowerCase('ru').replaceAll('ё','е').includes(q);
        });
    },
    filter(){
        const q=document.getElementById('authorSearch')?.value||'',suit=document.getElementById('authorSuit')?.value||'all';
        const items=this.search(this.tab,q,suit);
        document.getElementById('authorCount').textContent=`Найдено: ${items.length}`;
        document.getElementById('authorResults').innerHTML=items.map((x,i)=>`<button class="book-row" onclick="Author.open('${this.tab}','${x.code||x.id}')"><span>${this.tab==='cards'?String(this.data.cards.indexOf(x)+1).padStart(2,'0'):this.tab==='practices'?String(i+1).padStart(2,'0'):String(x.id).padStart(2,'0')}</span><span><strong>${this.e(x.name||x.title)}</strong><small>${this.e(x.name?(x.title||x.theme):x.duration||'Урок к главе '+x.chapter)}</small></span><span aria-hidden="true">↗</span></button>`).join('')||'<p>Совпадений нет. Попробуй другое слово или измени фильтр.</p>';
    },
    prose(sections){return `<div class="book-prose author-prose">${sections.map(([title,text])=>`<section><h3>${this.e(title)}</h3><p>${this.e(text)}</p></section>`).join('')}</div>`;},
    detail(item){
        const tab=this.tab,body=document.getElementById('authorBody');
        let content=`<button class="text-btn" onclick="Author.open('${tab}')">← К списку</button><h3 class="author-title">${this.e(item.name||item.title)}</h3>`;
        if(tab==='cards'){
            content+=`<p class="author-lead">${this.e(item.title)}</p><img class="author-card-image" src="${this.e(item.img)}" alt="${this.e(item.name)}" width="210" height="360">`;
            content+=this.prose([['Образ',item.image],['Смысл',item.meaning],['Ресурс',item.resource],['Где становится трудно',item.shadow],['Перевёрнутое положение: другой ракурс',item.reversed],['Вопрос к себе',item.question],['Попробуй сегодня',item.practice]]);
            content+=`<div class="book-actions"><button class="primary-button" onclick="Author.startCard('${item.code}')">Моя практика с картой</button><button class="text-btn" onclick="Academy.detail('${item.code}')">Карта в атласе</button><button class="text-btn" onclick="Book.open('${item.chapter}')">Глава ${item.chapter} книги</button></div>`;
        }else if(tab==='lessons'){
            content+=this.prose([['Главная мысль',item.idea],['Пример',item.example],['Вопрос к себе',item.question],['Задание',item.exercise],['Что стоит сохранить',item.takeaway]]);
            content+=`<div class="book-actions"><button class="primary-button" onclick="Book.open('${item.chapter}')">Читать главу ${item.chapter}</button><button class="text-btn" onclick="Author.open('practices')">Перейти к практикам</button></div>`;
        }else if(tab==='lenormand'){
            const pair=this.data.lenormand.find(x=>x.id===item.pair.with);
            content+=`<p class="author-lead">${this.e(item.theme)}</p>`+this.prose([['Образ в разговоре',item.meaning],['Вопрос к себе',item.question],['Небольшая практика',item.practice],['Пример связи: '+item.name+' + '+pair.name,item.pair.text]]);
            content+=`<div class="book-actions"><button class="primary-button" onclick="Author.open('lenormand','${pair.id}')">${this.e(pair.name)} · вторая карта</button><button class="text-btn" onclick="Book.open('14')">Ленорман в книге</button></div>`;
        }else{
            content+=`<p class="book-meta">${this.e(item.duration)}</p><p class="author-lead">${this.e(item.intro)}</p><ol class="author-steps">${item.steps.map(step=>`<li>${this.e(step)}</li>`).join('')}</ol>`+this.prose([['Вопросы для записи',item.questions.join(' ')],['Завершение',item.closing]]);
            content+=`<div class="book-actions"><button class="primary-button" onclick="Author.startPractice('${item.id}')">Открыть дневник практики</button><button class="text-btn" onclick="Book.open('${item.chapter}')">Связанная глава</button></div>`;
        }
        const list=this.data[tab],n=list.indexOf(item),prev=list[n-1],next=list[n+1];
        content+=`<nav class="book-pagination" aria-label="Материалы по порядку">${prev?`<button class="text-btn" onclick="Author.open('${tab}','${prev.code||prev.id}')">← Предыдущий материал</button>`:'<span></span>'}${next?`<button class="text-btn" onclick="Author.open('${tab}','${next.code||next.id}')">Следующий материал →</button>`:''}</nav><p class="source-note">Дополнение к «Карте как зеркалу». Вопросы и упражнения можно пропустить; личный отклик не требует совпадения с текстом.</p>`;
        body.innerHTML=content;
    },
    startCard(code){const c=this.data?.cards.find(x=>x.code===code);if(c)this.start(c.code,c.chapter,c.name+' · '+c.question,[c.practice]);},
    startPractice(id){const p=this.data?.practices.find(x=>x.id===id);if(p)this.start(p.card,p.chapter,p.title+' · '+p.questions.join(' '),p.steps,p.closing);},
    start(code,chapter,question,steps,closing=''){
        if(!App.deckReady())return;
        Book.current=null;
        Book.practice(null,{card:code,chapter,question,exercise:{steps:[...steps],closing}});

    }
};
