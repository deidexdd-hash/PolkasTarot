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
ctx.fetch=async()=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,'data/book.json')))});
vm.runInContext(fs.readFileSync(path.join(root,'js/daily.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'js/book.js'),'utf8'),ctx);
(async()=>{
 const B=ctx.Book;await B.load();
 assert.equal(B.data.chapters.length,36);
 assert.equal(B.data.sources.length,18);
 assert.equal(B.data.chapters.flatMap(c=>c.blocks).filter(b=>b.card).length,22);
 B.practiceChapter='12';
 get('mirrorCard').value=cards[0].code;
 get('mirror-firstLook').value='<img src=x>';
 get('mirror-notes').value='Моя мысль';
 get('mirror-followUp').value='Мой шаг';
 get('mirror-question').value='Вопрос';
 B.savePractice();
 const item=ctx.State.history[0];assert(ctx.Journal.validate(item));
 assert.equal(item.bookChapter,'12');assert.equal(item.firstLook,'<img src=x>');
 B.savePractice();assert.equal(ctx.State.history.length,1);
 ctx.HistoryStore.load();assert.equal(ctx.State.history[0].notes,'Моя мысль');
 assert(!ctx.Journal.validate({...item,bookChapter:"x');alert(1)//"}));
 assert(!ctx.Journal.validate({...item,bookPractice:'true'}));
 denied=true;B.savePractice();assert(get('mirrorStatus').textContent.includes('Не сохранено'));

 denied=false;
 const originalQuery=ctx.document.querySelector,originalQueries=ctx.document.querySelectorAll;
 ctx.document.querySelector=selector=>selector==='.book-prose'?{}:null;
 ctx.document.querySelectorAll=()=>[{dataset:{bookBlock:'7'},getBoundingClientRect:()=>({bottom:180})}];
 B.current=B.data.chapters.find(c=>c.id==='12');B.track();
 assert.equal(B.position.block,7);
 assert.equal(JSON.parse(storage.get('polkas-book-v1')).block,7);
 const modal=get('cardModal');modal.classList.contains=()=>true;
 ctx.document.querySelectorAll=()=>[{dataset:{bookBlock:'2'},getBoundingClientRect:()=>({bottom:180})}];
 B.track();assert.equal(B.position.block,7,'Modal scroll must not overwrite reading position');
 modal.classList.contains=()=>false;
 ctx.document.querySelector=originalQuery;ctx.document.querySelectorAll=originalQueries;
 ctx.location.hash='';
 const container=get('spread-container');container.innerHTML='Opened book';
 container.querySelector=()=>({});ctx.DeckLoader.load=async()=>{throw Error('offline');};
 await ctx.App.init();
 assert.equal(container.innerHTML,'Opened book','Late deck failure must not replace the book');
 console.log('PASS: reading position, modal scroll isolation, late deck loading failure');
 console.log('PASS: 34 chapters + prologue/epilogue, 18 sources, 22 card links; diary persistence, duplicate protection, metadata validation, denied storage');
})().catch(e=>{console.error(e);process.exit(1)});
