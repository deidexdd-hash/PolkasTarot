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
 const dom=await JSDOM.fromFile(path.join(root,'index.html'),{url:'https://polkas.test/',virtualConsole:vc,resources:new LocalResources(),runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
  w.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,String(url))))});
  w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.alert=m=>errors.push('alert: '+m);w.confirm=()=>true;
 }});
 const w=dom.window,$=s=>w.document.querySelector(s),all=s=>Array.from(w.document.querySelectorAll(s));
 try{
  await until(()=>w.DeckLoader?.loaded&&$('.home-spread-symbol'));
  assert.equal(all('#questionInput').length,1);assert.equal(all('h1').length,1);assert.equal(all('.home-spread-symbol').length,8);
  assert.equal($('[data-home-count="spreads"]').textContent,'20');assert.equal(w.State.history.length,0);
  const images=all('img[src^="img/editorial/"]');assert.equal(images.length,3);
  for(const img of images){
   assert(img.alt);assert(img.getAttribute('width'));assert(img.getAttribute('height'));
   const paths=[img.getAttribute('src'),...img.getAttribute('srcset').split(',').map(s=>s.trim().split(' ')[0])];
   for(const file of paths){assert(fs.existsSync(path.join(root,file)));assert(fs.statSync(path.join(root,file)).size<160000);}
  }
  assert.equal(images[0].getAttribute('fetchpriority'),'high');assert(!images[0].hasAttribute('loading'));
  assert(images.slice(1).every(img=>img.loading==='lazy'||img.getAttribute('loading')==='lazy'));
  $('#homeMenuToggle').click();assert.equal($('#homeMenu').hidden,false);assert.equal($('#homeMenuToggle').getAttribute('aria-expanded'),'true');
  assert.equal(w.document.activeElement,$('#homeMenu button'));
  w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal($('#homeMenu').hidden,true);assert.equal(w.document.activeElement,$('#homeMenuToggle'));
  $('#homeMenuToggle').click();$('#questionInput').focus();assert.equal($('#homeMenu').hidden,true);
  $('#homeMenuToggle').click();$('#homeMenu [onclick="Home.go(\'book\')"]').click();
  await until(()=>$('#bookContents .book-row'));assert.equal($('#homeMenu').hidden,true);assert.equal($('meta[name="theme-color"]').content,'#171219');
  assert.equal(w.getComputedStyle($('.home-book-feature')).display,'none');
  assert.notEqual(w.getComputedStyle($('.book-actions .primary-button')).display,'none');
  $('.brand').click();assert.equal($('meta[name="theme-color"]').content,'#f5f1e8');assert(!w.document.body.classList.contains('reading-active'));
  $('#questionInput').value='Что мне стоит заметить? <img src=x onerror=alert(1)>';
  $('#homeStartReading').click();assert.equal(w.State.history.length,1);assert.equal(w.State.history[0].spreadKey,'threecards');
  assert.equal(w.State.history[0].question,'Что мне стоит заметить? <img src=x onerror=alert(1)>');assert.equal(all('img[src="x"]').length,0);
  assert.equal(all('.card-item').length,3);assert.equal(w.getComputedStyle($('.home-hero-actions')).display,'none');
  $('.brand').click();$('#homeOpenAtlas').click();assert.equal(all('.atlas-card').length,78);
  $('.brand').click();$('#homeOpenJournal').click();assert.equal(w.document.activeElement,$('#history-sidebar'));
  $('.brand').click();$('#homeDaily').click();assert.equal(w.State.history[0].dailyPractice,true);const count=w.State.history.length;
  $('.brand').click();$('#homeDaily').click();assert.equal(w.State.history.length,count,'Card of the day is reused');
  $('.brand').click();w.Home.go('layouts');await until(()=>$('.layout-tile'));assert.equal(all('.layout-tile').length,20);
  assert.deepEqual(errors,[]);
  console.log('PASS HOME DOM: local responsive images, eight live scheme icons, menu and keyboard focus, light/dark transitions, exact question handoff, book, atlas, daily reuse, catalog and diary');
 }finally{w.close();}
})().catch(e=>{console.error(e);process.exit(1);});
