// No dependency needed: exercise persistence, migration, import and reading flows.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');
const storage = new Map();
let denied = false;
const nodes = new Map();
const element = () => ({innerHTML:'',textContent:'',value:'',checked:false,style:{},classList:{add(){},remove(){}},appendChild(){},scrollIntoView(){},remove(){},click(){}});
const get = id => { if (!nodes.has(id)) nodes.set(id,element()); return nodes.get(id); };
const ctx = {console:{log(){},warn(){},error(){}},crypto:require('node:crypto').webcrypto,URLSearchParams,Date,Math,Uint32Array,
    document:{getElementById:get,querySelectorAll:()=>[],createElement:element,addEventListener(){},body:element()},
    localStorage:{getItem:k=>storage.get(k)??null,setItem(k,v){if(denied)throw Error('denied');storage.set(k,v);}},
    setTimeout(){},location:{hash:'',pathname:'/',search:''},history:{replaceState(){}},scrollTo(){},alert(m){throw Error(m)}};
ctx.window=ctx;vm.createContext(ctx);
for(const name of ['state','loader','spreads','utils','deck','history','ui','app','journal'])vm.runInContext(fs.readFileSync(path.join(ROOT,'js',name+'.js'),'utf8'),ctx);
const data=JSON.parse(fs.readFileSync(path.join(ROOT,'data/cards.json')));
ctx.DeckLoader.fill(data.cards);ctx.DeckLoader.loaded=true;
let rendered;
ctx.UI.renderSpread=(title,cards,config)=>{rendered=JSON.parse(JSON.stringify({title,cards,config}));};
const legacy={name:'Старая карта',spreadName:'Карта дня',date:'2026'};
storage.set('tarot-history',JSON.stringify([legacy]));ctx.HistoryStore.load();assert.equal(ctx.State.history.length,1);
for(const key of Object.keys(ctx.Spreads.types)) {
    ctx.App.doSpread(key);
    const item=ctx.State.history[0];
    assert(ctx.Journal.validate(item),key+' snapshot validation');
    assert.equal(item.cards.length,ctx.Spreads.types[key].count);
    assert.equal(new Set(item.cards.map(c=>c.cardId)).size,item.cards.length);
}
assert.equal(ctx.State.history.length,9);assert.equal(storage.get('tarot-history'),JSON.stringify([legacy]));
const before=JSON.stringify(ctx.State.history[0].cards);
ctx.State.history=[];ctx.HistoryStore.load();ctx.Journal.open(0);
assert.equal(JSON.stringify(rendered.cards),before);assert.equal(ctx.State.history.length,9);
get('readingNotes').value='<script>alert(1)</script>';get('readingTags').value='работа';get('readingFavorite').checked=true;
ctx.Journal.draft();ctx.State.history=[];ctx.HistoryStore.load();assert.equal(ctx.State.history[0].notes,'<script>alert(1)</script>');
ctx.Journal.open(0);assert.equal(ctx.State.history[0].favorite,true);
const cards=data.cards.slice(0,3).map((c,i)=>({...c,reversed:i===1}));
ctx.App.doSpread('threecards',{manualCards:cards});
assert.equal(ctx.State.history[0].source,'manual');assert.equal(ctx.State.history[0].cards[1].orientation,'reversed');
assert.equal(ctx.Journal.validManual([cards[0],cards[0],cards[2]],3),false);
assert.equal(ctx.Journal.validManual([null],1),false);
const snapshot=JSON.parse(JSON.stringify(ctx.State.history[0]));
snapshot.config.grid='url(https://invalid)';assert.equal(ctx.Journal.validate(snapshot),false);
snapshot.config=JSON.parse(JSON.stringify(ctx.State.history[0].config));snapshot.cards[0].img='https://invalid';assert.equal(ctx.Journal.validate(snapshot),false);
get('journalSearch').value='работа';ctx.UI.renderHistory();assert(get('historyList').innerHTML.includes('Открыть'));
get('journalSearch').value='NO MATCH';ctx.UI.renderHistory();assert(get('historyList').innerHTML.includes('Записей не найдено'));
(async()=>{
 const exported=JSON.stringify({schemaVersion:2,readings:ctx.State.history});
 const input={files:[{size:exported.length,text:async()=>exported}],value:'file'};
 const count=ctx.State.history.length;await ctx.Journal.importData(input);assert.equal(ctx.State.history.length,count);
 ctx.State.history=[];await ctx.Journal.importData(input);assert.equal(ctx.State.history.length,count);
 const corrupt={schemaVersion:2,readings:[snapshot]};input.files[0].text=async()=>JSON.stringify(corrupt);
 await ctx.Journal.importData(input);assert.equal(ctx.State.history.length,count);assert(get('journalStatus').textContent.includes('не выполнен'));
 denied=true;assert.equal(ctx.HistoryStore.save(),false);
 const extra=JSON.parse(exported);extra.readings[0].id='new-reading';input.files[0].text=async()=>JSON.stringify(extra);
 await ctx.Journal.importData(input);assert.equal(ctx.State.history.length,count,'Failed import must roll back');
 console.log('PASS: 8 spreads; exact snapshot restoration; legacy backup; notes/favorites; manual orientation and duplicates; search; import round-trip/deduplication/rejection/rollback; storage failure');
})().catch(e=>{console.error(e);process.exitCode=1});
