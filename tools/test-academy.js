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
const A=ctx.Academy;
assert.equal(Object.keys(ctx.TarotKnowledge).length,22);
for(const c of cards.slice(0,22)){const k=ctx.TarotKnowledge[c.code];assert(k.summary&&k.prompt);assert.equal(k.symbols.length,3);assert(k.source.startsWith('https://sacred-texts.com/'));}
assert.equal(A.searchCards('','all').length,78);assert.equal(A.searchCards('','major').length,22);assert.equal(A.searchCards('','cups').length,14);
assert(A.searchCards('фонарь','all').some(c=>c.code==='major_arcana.09'));
for(const c of cards)A.state.notes[c.code]='Личная ассоциация';A.save();A.state.notes={};A.read();assert.equal(Object.keys(A.state.notes).length,78,'All card identifiers survive storage');
assert.equal(A.searchCards('Личная ассоциация','all').length,78);
A.state.progress={};A.trainingCode=null;const initial=A.nextTraining();assert(initial);A.trainingCode=initial.code;A.answerShown=true;const train=A.train;A.train=()=>{};
A.rateTraining(true);assert.equal(A.state.progress[initial.code].level,1);assert(A.state.progress[initial.code].due>Date.now());A.rateTraining(true);assert.equal(A.state.progress[initial.code].seen,1,'Cannot rate twice');
assert.notEqual(A.nextTraining().code,initial.code);A.train=train;
let render;ctx.UI.renderSpread=(title,cards,cfg)=>{render={title,cards,cfg};};ctx.Journal.showEditor=()=>{};
A.state.settings.reversals=false;ctx.App.doSpread('year',{question:'Проверка',day:'2026-09-11'});assert(render.cards.every(c=>c.orientation==='direct'));
assert(ctx.location.hash.includes('r=0'));assert.equal(ctx.App.readLink().reversals,false);
const saved=JSON.stringify(render.cards);A.state.settings.reversals=true;const link=ctx.App.readLink();ctx.App.doSpread(link.spreadKey,link);assert.equal(JSON.stringify(render.cards),saved,'Shared link overrides local preference');
ctx.location.hash='#s=threecards&q=old&d=2026-09-11';assert.equal(ctx.App.readLink().reversals,true,'Old links retain reversals');
ctx.App.doSpread('daily',{manualCards:[{...cards[0],reversed:true}],reversals:false});assert.equal(render.cards[0].orientation,'reversed','Manual orientation is preserved');
const now=Date.now();ctx.State.history=[{schemaVersion:2,createdAt:new Date(now-1000).toISOString(),cards:[{cardId:cards[0].code,orientation:'direct'},{cardId:cards[22].code,orientation:'reversed'}]},{schemaVersion:2,createdAt:new Date(now-40*86400000).toISOString(),cards:[{cardId:cards[0].code,orientation:'direct'}]},{name:'Legacy'}];
const stats=A.calculateStats(7,now);assert.equal(stats.sessions,1);assert.equal(stats.total,2);assert.equal(stats.reversed,1);assert.equal(stats.suits.major,1);assert.equal(stats.suits.wands,1);assert.equal(stats.excluded,1);assert.equal(A.calculateStats(0,now).total,3);
get('compareA').value=cards[0].code;get('compareB').value=cards[1].code;get('compareContext').value='general';A.renderComparison();assert(get('comparisonResult').innerHTML.includes('Шут'));assert(get('comparisonResult').innerHTML.includes('Маг'));
get('compareB').value=cards[0].code;A.renderComparison();assert(get('comparisonResult').innerHTML.includes('две разные'));
ctx.State.history=[{id:'reflection',schemaVersion:2,cards:[]}];ctx.Journal.currentId='reflection';get('firstLookNote').value='<img onerror=alert(1)>';
A.saveReflection('firstLook','firstLookNote');assert.equal(ctx.State.history[0].firstLook,'<img onerror=alert(1)>');assert(A.e(ctx.State.history[0].firstLook).includes('&lt;img'));
A.currentCode=cards[77].code;get('personalCardNote').value='Моя заметка';A.saveCardNote();A.read();assert.equal(A.state.notes[cards[77].code],'Моя заметка');
denied=true;assert.equal(A.save(),false);A.saveCardNote();assert(get('cardNoteStatus').textContent.includes('Не сохранено'));
console.log('PASS: 22 study cards / 66 symbols; search and suit filters; persistence for all 78 card notes; training scheduling and duplicate-rating guard; reversals and legacy/shared links; manual orientation; dated statistics; comparison; reflection escaping; storage failures');
