// Every interior uses the shared design without replacing its data or actions.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole,ResourceLoader}=require('jsdom');
const root=path.resolve(__dirname,'..');
class LocalResources extends ResourceLoader {
 fetch(url){const u=new URL(url);if(u.hostname!=='polkas.test')return null;const file=path.resolve(root,'.'+u.pathname);return file.startsWith(root+path.sep)&&fs.existsSync(file)?Promise.resolve(fs.readFileSync(file)):null;}
}
async function until(test){for(let i=0;i<150;i++){if(test())return;await new Promise(r=>setTimeout(r,10));}throw Error('Expected view did not load');}
(async()=>{
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));vc.on('error',e=>errors.push(String(e)));
 const dom=await JSDOM.fromFile(path.join(root,'index.html'),{url:'https://polkas.test/',virtualConsole:vc,resources:new LocalResources(),runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
  w.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,String(url))))});
  w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.alert=m=>errors.push('alert: '+m);w.confirm=()=>true;
 }});
 const w=dom.window,$=s=>w.document.querySelector(s),all=s=>Array.from(w.document.querySelectorAll(s));
 try {
  await until(()=>w.DeckLoader?.loaded&&w.Personal);
  await w.Personal.hub();assert(w.Personal.entries.length>200);assert.equal(w.State.history.length,0);
  $('#personalSearch').value='границы';w.Personal.search();assert(all('.personal-result').length>0);
  $('.personal-result > button:nth-child(2)').click();assert.equal(w.Personal.state.favorites.length,1);
  $('#personalFavorites').checked=true;w.Personal.search();assert.equal(all('.personal-result').length,1);
  w.Personal.read();assert.equal(w.Personal.state.favorites.length,1);
  await w.Personal.course();assert.equal($('#courseProgress').max,34);
  const lesson=w.Author.data.lessons[0];await w.Author.open('lessons',lesson.id);
  all('#authorBody button').find(b=>b.textContent==='Отметить урок пройденным').click();
  await w.Personal.course();assert.equal($('#courseProgress').value,1);
  w.App.doSpread('threecards',{question:'Мой шаг'});const id=w.State.history[0].id;
  assert.equal(all('.personal-card-path').length,3);
  w.Personal.view('step');assert.equal(all('.card-item:not([hidden])').length,1);
  $('.personal-pager button:last-child').click();assert.equal(w.Personal.step,1);
  w.Personal.view('list');assert.equal(all('.card-item:not([hidden])').length,3);
  for(const [key,value] of [['moodBefore','Тревожно'],['moodAfter','Спокойнее'],['followUp','Сделала шаг <img src=x>']]){
   $('#personal-'+key).value=value;$('#personal-'+key).dispatchEvent(new w.Event('input'));
  }
  w.Daily.journal();w.Journal.open(w.State.history.findIndex(x=>x.id===id));
  assert.equal($('#personal-moodAfter').value,'Спокойнее');assert.equal($('#personal-followUp').value,'Сделала шаг <img src=x>');assert.equal(all('img[src=x]').length,0);
  const record=JSON.parse(JSON.stringify(w.State.history.find(x=>x.id===id)));assert(w.Journal.validate(record));record.moodBefore={bad:true};assert(!w.Journal.validate(record));
  $('.personal-card-path button').click();await until(()=>$('#authorBody .author-card-image'));
  all('#authorBody button').find(b=>b.textContent==='Моя практика с картой').click();assert($('#mirrorCard'));
  $('#mirror-notes').value='Моя ассоциация';$('#mirror-notes').dispatchEvent(new w.Event('input'));assert(w.State.history[0].bookPractice);
  await w.Personal.hub();
  const input=$('#bookContent input[type=file]');const imported={type:'polkas-personal',version:1,data:{favorites:['book:13'],completed:[lesson.id]}};
  Object.defineProperty(input,'files',{configurable:true,value:[{size:200,text:async()=>JSON.stringify(imported)}]});
  await input.onchange();assert(w.Personal.state.favorites.includes('book:13'));const merged=w.Personal.state.favorites.length;
  await input.onchange();assert.equal(w.Personal.state.favorites.length,merged,'import deduplicates');
  imported.data.favorites=['unknown:bad'];await input.onchange();assert.equal(w.Personal.state.favorites.length,merged,'invalid backup does not replace state');
  const before=w.Personal.state.favorites.length;Object.defineProperty(w,'localStorage',{value:{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}}});
  imported.data.favorites=['book:12'];await input.onchange();assert.equal(w.Personal.state.favorites.length,before,'failed persistence rolls back import');
  assert.equal(w.Personal.save(),false);w.Personal.read();assert.equal(w.Personal.state.favorites.length,before);
  assert.deepEqual(errors,[]);console.log('PASS PERSONAL: global search, favorites persistence, lesson progress, card navigation, author-to-practice flow, diary reopening, escaping and blocked storage');
 }finally{w.close();}
})().catch(e=>{console.error(e);process.exit(1);});
