// Functional tests without browser dependencies. Browser layout is not covered.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),storage=new Map(),nodes=new Map();let denied=false;
function element(){return {innerHTML:'',textContent:'',value:'',checked:false,hidden:false,disabled:false,selectedIndex:0,style:{},dataset:{},classList:{add(){},remove(){},toggle(){},contains(){return false;}},appendChild(){},insertBefore(){},before(){},after(){},focus(){},setAttribute(){},querySelector(){return null;},querySelectorAll(){return[];},scrollIntoView(){},remove(){},click(){}};}
function get(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);}
const ctx={console:{log(){},warn(){},error(){}},crypto:require('node:crypto').webcrypto,URLSearchParams,Uint32Array,Date,Math,Blob,URL,
 document:{getElementById:get,querySelector:()=>null,querySelectorAll:()=>[],createElement:element,addEventListener(){},body:element()},
 localStorage:{getItem:k=>storage.get(k)??null,setItem(k,v){if(denied)throw Error('denied');storage.set(k,v);}},
 setTimeout(){},location:{hash:'',pathname:'/',search:''},history:{replaceState(a,b,url){ctx.location.hash=url.startsWith('#')?url:'';}},scrollTo(){},alert(m){throw Error(m);},confirm:()=>true};
ctx.window=ctx;vm.createContext(ctx);
for(const f of ['state','loader','spreads','utils','deck','history','ui','app','journal','knowledge','academy'])vm.runInContext(fs.readFileSync(path.join(root,'js',f+'.js'),'utf8'),ctx);
const cards=JSON.parse(fs.readFileSync(path.join(root,'data/cards.json'))).cards;ctx.DeckLoader.fill(cards);ctx.DeckLoader.loaded=true;

ctx.addEventListener=()=>{};ctx.clearTimeout=()=>{};
ctx.fetch=async(url)=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,url)))});
vm.runInContext(fs.readFileSync(path.join(root,'js/daily.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'js/book.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'js/author.js'),'utf8'),ctx);
(async()=>{
 const A=ctx.Author,d=await A.load(),book=JSON.parse(fs.readFileSync(path.join(root,'data/book.json')));
 assert.equal(d.cards.length,78);assert.equal(d.lessons.length,34);assert.equal(d.lenormand.length,36);assert.equal(d.practices.length,8);
 assert.deepEqual(new Set(d.cards.map(c=>c.code)),new Set(cards.map(c=>c.code)));
 const chapters=new Set(book.chapters.map(c=>c.id)),lenormandIds=new Set(d.lenormand.map(c=>c.id));
 for(const c of d.cards){
  assert.equal(c.img,cards.find(x=>x.code===c.code).img);
  assert(fs.existsSync(path.join(root,c.img)),'Local image for '+c.code);
  assert(chapters.has(c.chapter));
  for(const k of ['title','image','meaning','resource','shadow','question','practice','reversed'])assert.equal(typeof c[k],'string',c.code+' '+k);
  assert(c.meaning.length>70);assert(c.practice.length>50);
 }
 for(const k of ['title','question','practice'])assert.equal(new Set(d.cards.map(c=>c[k])).size,78,'Every card has its own '+k);
 assert.deepEqual(d.lessons.map(l=>l.chapter),Array.from({length:34},(_,i)=>String(i+1)));
 for(const c of d.lenormand){assert(lenormandIds.has(c.pair.with));assert.notEqual(c.pair.with,c.id);assert(c.meaning&&c.question&&c.practice&&c.pair.text);}
 for(const p of d.practices){assert(chapters.has(p.chapter));assert(cards.some(c=>c.code===p.card));assert(p.steps.length>=5);assert.equal(p.questions.length,3);}
 assert.equal(A.search('cards','','all').length,78);assert.equal(A.search('cards','','major_arcana').length,22);
 for(const suit of ['wands','cups','swords','pentacles'])assert.equal(A.search('cards','',suit).length,14);
 assert(A.search('cards','границ').length>0);assert(A.search('lenormand','корабль').length>0);
 assert.equal(A.search('cards','несуществующаястрока').length,0);
 get('bookContent').isConnected=true;
 await A.open('cards','minor_arcana.wands.ace');assert(get('authorBody').innerHTML.includes('Искра просит воздуха'));assert(get('authorBody').innerHTML.includes('Моя практика с картой'));
 await A.open('lenormand','4');assert(get('authorBody').innerHTML.includes('Дом + Сад'));
 await A.open('lessons','34');assert(get('authorBody').innerHTML.includes('Читать главу 34'));
 await A.open('practices','boundary');assert(get('authorBody').innerHTML.includes('Открыть дневник практики'));
 await A.open('invalid',"' onclick='bad");assert.equal(A.tab,'cards');assert(get('authorBody').innerHTML.includes('authorSearch'));
 let preset;const practice=ctx.Book.practice;ctx.Book.practice=(id,p)=>{preset=p;};
 A.startCard('minor_arcana.wands.ten');assert.equal(preset.card,'minor_arcana.wands.ten');assert.equal(preset.chapter,'13');assert(preset.exercise.steps[0].includes('Раздели дела'));
 A.startPractice('boundary');assert.equal(preset.chapter,'12');assert.equal(preset.exercise.steps.length,5);
 ctx.Book.practice=practice;
 ctx.Book.practicePrompt={steps:['<img src=x onerror=alert(1)>','Второй шаг'],closing:'Завершение'};
 ctx.Book.practiceChapter='13';
 get('mirrorCard').value=cards[0].code;get('mirror-question').value='Вопрос';
 ctx.Book.savePractice();const item=ctx.State.history[0];assert(ctx.Journal.validate(item));
 ctx.HistoryStore.load();assert.equal(ctx.State.history[0].bookExercise.steps[0],'<img src=x onerror=alert(1)>');
 let guide;const create=ctx.document.createElement;ctx.document.createElement=()=>{guide=element();return guide;};ctx.Book.showExercise();
 assert(guide.innerHTML.includes('&lt;img'));assert(!guide.innerHTML.includes('<img'));
 ctx.document.createElement=create;
 assert(!ctx.Journal.validate({...item,bookExercise:{steps:[{}],closing:''}}));
 assert(!ctx.Journal.validate({...item,bookExercise:{steps:Array(11).fill('x'),closing:''}}));
 assert(!ctx.Journal.validate({...item,bookPractice:false}));
 A.data=null;let attempts=0;ctx.fetch=async()=>{attempts++;if(attempts===1)throw Error('offline');return {ok:true,json:async()=>d};};
 await assert.rejects(()=>A.load());assert.equal(A.pending,null);await A.load();assert.equal(A.data.cards.length,78);
 console.log('PASS: all 78/34/36/8 entries, unique card text, chapter/pair references, all filters, author routes, practice presets, exercise persistence/validation/escaping, retry after failed load');
})().catch(e=>{console.error(e);process.exit(1);});
