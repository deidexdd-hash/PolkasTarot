// Real layout coverage for every internal screen, including a dark OS preference.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'screenshots/interiors');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+(new URL(req.url,'http://localhost').pathname==='/'?'/index.html':new URL(req.url,'http://localhost').pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
const routes=['study','train','compare','stats','deck','modal','book','chapter','cards','lessons','pairs','courts','cases','lenormand','practices','layouts','guide','manual','reading','daily','mirror','journal','library','course','lesson','step','list','card-detail'];
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 for(const [engineName,engine] of Object.entries({chromium,webkit})){
  const browser=await engine.launch({headless:true});
  try{
   const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,colorScheme:'dark',reducedMotion:'reduce',...(engineName==='webkit'?{isMobile:true,hasTouch:true}:{})});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>DeckLoader.loaded&&window.Editorial);
   for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:width<700?844:1000});
    for(const route of routes){
     await page.evaluate(async route=>{
      UI.closeCard();
      switch(route){
       case 'card-detail':await Author.load();await Author.open('cards','major_arcana.02');break;case 'library':await Personal.hub();break;case 'course':await Personal.course();break;case 'lesson':await Author.load();await Author.open('lessons',Author.data.lessons[0].id);break;case 'step':case 'list':App.doSpread('threecards',{question:'Мой шаг'});Personal.view(route);break;
       case 'study':Academy.home();break;case 'train':Academy.train();break;case 'compare':Academy.compare();break;case 'stats':Academy.stats();break;
       case 'deck':App.showDeck();break;case 'modal':App.showDeck();Academy.detail('major_arcana.02');break;
       case 'book':await Book.open();break;case 'chapter':await Book.open('13');break;
       case 'cards':case 'lessons':case 'pairs':case 'courts':case 'cases':case 'lenormand':case 'practices':await Author.open(route);break;
       case 'layouts':await SpreadLibrary.open();break;case 'guide':await SpreadLibrary.open('celtic');break;
       case 'manual':Journal.showManual();break;case 'reading':App.doSpread('threecards',{question:'Что поможет сделать следующий шаг?'});break;
       case 'daily':Daily.open();break;case 'mirror':Book.practice();break;case 'journal':Daily.journal();break;
      }
     },route);
     const selector=route==='journal'?'#history-sidebar .editorial-hero':'#spread-container .editorial-hero';
     await page.locator(selector).waitFor({state:'visible'});
     await page.locator(selector+' img').evaluate(async img=>{await img.decode();});
     assert(await page.locator('.reading-studio').isHidden(),engineName+' '+route+' home question leaks into interior');
     assert(await page.locator('#questionInput').isHidden(),engineName+' '+route+' home input must stay on home');
     assert.equal(await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(245, 241, 232)',engineName+' '+route+' body theme');
     assert.equal(await page.locator('meta[name="theme-color"]').getAttribute('content'),'#f5f1e8');
     const measurement=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,overflow:Array.from(document.querySelectorAll('body *')).map(el=>{const r=el.getBoundingClientRect();return {tag:el.tagName,id:el.id,cls:el.className?.baseVal??el.className,left:r.left,right:r.right,width:r.width,scroll:el.scrollWidth,client:el.clientWidth};}).filter(r=>r.width>0&&(r.right>innerWidth+.5||r.left<-.5||r.scroll>r.client+1)).slice(0,25)}));
     if(measurement.scroll>measurement.width){console.error('OVERFLOW '+engineName+' '+width+' '+route+' '+JSON.stringify(measurement));await page.screenshot({path:path.join(out,`${engineName}-${width}-${route}-overflow.png`),fullPage:true});}
     assert(measurement.scroll<=measurement.width,engineName+' '+width+' '+route+' horizontal overflow');
     const photo=await page.locator(selector+' img').evaluate(el=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height,loaded:el.complete&&el.naturalWidth>0};});
     assert(photo.loaded&&photo.width>40&&photo.height>40,engineName+' '+route+' photograph');
     for(const button of await page.locator('#spread-container .primary-button').all())assert(await button.isVisible(),engineName+' '+route+' hidden primary action');
     if(route==='card-detail'){await page.getByRole('button',{name:'Увеличить карту',exact:true}).click();await page.locator('#personalZoom img').evaluate(img=>img.decode());assert(await page.locator('#personalZoom').isVisible());await page.getByRole('button',{name:'Закрыть',exact:true}).click();await page.locator('#personalZoom').waitFor({state:'detached'});assert.equal(await page.locator('#personalZoom').count(),0);}
     if(route==='train')assert(await page.locator('#showTrainingAnswer').isVisible());
     if(route==='modal'){
      assert.equal(await page.locator('.sheet').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(250, 247, 240)');
      const sheet=await page.locator('.sheet').evaluate(el=>({scroll:el.scrollWidth,width:el.clientWidth}));assert(sheet.scroll<=sheet.width,engineName+' modal overflow');
     }
     for(const field of await page.locator('#spread-container input:not([type=checkbox]),#spread-container textarea,#spread-container select').all())if(await field.isVisible())assert(parseFloat(await field.evaluate(el=>getComputedStyle(el).fontSize))>=16,engineName+' '+route+' readable input');
     if([390,1440].includes(width)&&['study','deck','modal','book','chapter','cards','layouts','reading','daily','journal','library','course','lesson','step','list'].includes(route)){
      // App.scrollToResults schedules its scroll after 300 ms; let it settle before capture.
      await page.waitForTimeout(350);
      if(route!=='modal'){
       const images=page.locator(selector+' img, .editorial-tile-photo img');
       for(const img of await images.all()){await img.evaluate(async el=>{el.loading='eager';await el.decode();});await img.scrollIntoViewIfNeeded();}
       await page.evaluate(()=>window.scrollTo(0,0));
      }
      await page.screenshot({path:path.join(out,`${engineName}-${width}-${route}.png`)});
     }
    }
    console.log('PASS '+engineName+' '+width+': '+routes.length+' interiors, light theme in dark OS mode, photos, controls, text and overflow');
   }
   assert.deepEqual(errors,[]);
  }finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
