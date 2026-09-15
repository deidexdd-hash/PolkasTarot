// Navigation, theme, personal question and existing reading surfaces in a real DOM.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole,ResourceLoader}=require('jsdom');
const root=path.resolve(__dirname,'..');
class LocalResources extends ResourceLoader{
 fetch(url){const u=new URL(url);if(u.hostname!=='polkas.test')return null;const file=path.resolve(root,'.'+u.pathname);return file.startsWith(root+path.sep)&&fs.existsSync(file)?Promise.resolve(fs.readFileSync(file)):null;}
}
async function until(test){for(let i=0;i<120;i++){if(test())return;await new Promise(r=>setTimeout(r,10));}throw Error('Page did not reach the expected state');}
(async()=>{
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));vc.on('error',e=>errors.push(String(e)));
 const dom=await JSDOM.fromFile(path.join(root,'index.html'),{url:'https://polkas.test/#about=author',virtualConsole:vc,resources:new LocalResources(),runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
  w.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,String(url))))});
  w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.alert=m=>errors.push('alert: '+m);w.confirm=()=>true;
 }});
 const w=dom.window,$=s=>w.document.querySelector(s),all=s=>Array.from(w.document.querySelectorAll(s));
 try {
  await until(()=>w.DeckLoader?.loaded&&$('.creator-prose'));
  assert.equal($('.book-title').textContent,'Екатерина Белая');
  assert($('.creator-prose').textContent.includes('Семь-я'));
  assert($('.creator-prose').textContent.includes('прополке картошки'));
  assert(!$('.creator-prose').textContent.includes('Огонь Внутри'));
  assert.equal(w.State.history.length,0);
  w.App.showHome();assert($('meta[name=author]').content==='Екатерина Белая');
  $('[data-creator-link]').click();assert($('.creator-prose'));
  await w.Book.open();assert($('.creator-welcome'));assert.equal(all('#bookContent .creator-byline').length,1);
  w.Book.chapter('13');assert.equal(all('#bookContent .creator-byline').length,1);
  await w.Author.open('cards','major_arcana.00');assert($('.creator-byline').textContent.includes('Екатерина Белая'));
  w.Academy.home();assert($('.creator-welcome'));assert($('.creator-byline'));
  await w.Personal.course();assert($('.creator-byline'));
  assert.equal(w.State.history.length,0);assert.deepEqual(errors,[]);
  console.log('PASS CREATOR: direct author link, attribution on home/book/materials/course, welcoming text and unchanged diary');
 }finally{w.close();}
})().catch(e=>{console.error(e);process.exit(1);});
