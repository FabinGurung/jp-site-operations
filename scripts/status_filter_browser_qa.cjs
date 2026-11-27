/* Playwright synthetic mobile+desktop QA of Sheets-V2 project-status controls. */
"use strict";
const assert = require("node:assert/strict");
const {chromium, webkit} = require("playwright");
const ORIGIN = process.env.QA_BASE || "http://127.0.0.1:8766";
const seen = [];
function check(msg){seen.push(msg);console.log("PASS "+msg)}
const stubLeaflet = () => {
  window.__qaMarkerCount = 0;
  window.__qaMarkers = [];
  window.__qaMapHandlers = {};
  window.__qaFitBoundsCalls = 0;
  window.L = {
    map(){return {setView(){return this},getZoom(){return 12},fitBounds(){window.__qaFitBoundsCalls++;return this},invalidateSize(){return this},on(name,handler){window.__qaMapHandlers[name]=handler;return this}}},
    tileLayer(){return {addTo(){return this}}},
    featureGroup(){return {
      addTo(){return this},clearLayers(){window.__qaMarkerCount=0;window.__qaMarkers=[];return this},
      getLayers(){return Array.from({length:window.__qaMarkerCount},()=>({}))},
      getBounds(){return [[28.2,83.9],[28.4,84.1]]}
    }},
    divIcon(x){return x},
    marker(coords, options){return {bindPopup(){return this},on(type, fn){
      if (type==="click") this.handler = fn; return this;
    },addTo(){window.__qaMarkerCount++; window.__qaMarkers.push({
      title:options.title, icon:options.icon.html, click:this.handler
    });return this}}}
  };
};
async function ready(page){
  await page.addInitScript(stubLeaflet);
  await page.route("https://unpkg.com/**",r=>r.abort());
  await page.goto(ORIGIN+"/", {waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector("#project-count")?.textContent==="4");
}
async function statusInfo(page){
  return await page.evaluate(()=>({
    projectCount:document.querySelector("#project-count").textContent,
    cards:document.querySelectorAll("#project-list button.project-entry").length,
    pins:window.__qaMarkerCount,
    filter:document.querySelector("#status-filter").value,
    active:[...document.querySelectorAll("[data-project-status][aria-pressed=true]")].map(e=>e.dataset.projectStatus),
    summary:document.querySelector("#status-filter-summary").textContent,
  }));
}
async function markerColours(page) {
  return page.evaluate(() => window.__qaMarkers.map(marker => {
    const holder = document.createElement("div");
    holder.innerHTML = marker.icon;
    return {title:marker.title, colour:holder.firstElementChild.style.getPropertyValue("--company-colour")};
  }));
}
(async()=>{
  const browser = await chromium.launch({headless:true,args:["--no-sandbox"]});
  try {
    const mobile = await browser.newPage({viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:1,hasTouch:true});
    await ready(mobile);
    assert.equal(await mobile.locator(".phone-menu").count(),0);
    assert.equal(await mobile.locator(".compact-nav a").count(),3);
    assert.equal(await mobile.locator(".compact-nav a[href='./extraction.html']").isVisible(),false);
    assert.equal(await mobile.locator("#navigation-panel").isVisible(),false);
    assert.equal(await mobile.locator("#field-filter-drawer").isVisible(),false);
    assert.equal(await mobile.locator("#map-canvas").isVisible(),true);
    assert.ok(await mobile.locator(".compact-nav").evaluate(el=>el.getBoundingClientRect().right<=window.innerWidth));
    assert.ok(Number.parseFloat(await mobile.locator("#project-filter").evaluate(el=>getComputedStyle(el).fontSize))>=16);
    for (const link of await mobile.locator(".compact-nav a:visible").all())
      assert.ok((await link.boundingBox()).height>=44);
    check("mobile map first with only two visible navigation links, collapsed filters, and 16px iOS inputs");
    await mobile.locator("#field-filter-toggle").click();
    assert.equal(await mobile.locator(".mobile-status-filter").isVisible(),true);
    assert.equal(await mobile.locator("#status-filter").isVisible(),false);
    assert.equal(await mobile.locator("[data-project-status]").count(),6);
    assert.deepEqual((await statusInfo(mobile)).active,["all"]);
    assert.equal((await statusInfo(mobile)).pins,4);
    assert.ok(!(await markerColours(mobile)).some(p=>p.title.includes("Demo completed")));
    assert.equal(await mobile.locator('[data-map-mode="activities"]').getAttribute("aria-pressed"),"true");
    const kinds = await mobile.evaluate(()=>window.__qaMarkers.map(m=>{const e=document.createElement("div");e.innerHTML=m.icon;return e.firstElementChild.className;}));
    assert.equal(kinds.filter(c=>c.includes("notice-highlight")).length,2);
    assert.equal(kinds.filter(c=>c.includes("notice-quiet")).length,2);
    const quiet = await mobile.evaluate(()=>{const e=document.createElement("div");e.innerHTML=window.__qaMarkers.find(m=>m.icon.includes("notice-quiet")).icon;document.body.append(e);const b=e.firstElementChild;const c=getComputedStyle(b);const v={width:c.width,opacity:c.opacity,text:b.textContent};e.remove();return v;});
    assert.equal(quiet.width,"8px");assert.ok(Number(quiet.opacity)<.5);assert.equal(quiet.text,"");
    assert.equal(await mobile.locator("#attention-count").getAttribute("data-notice-sites"),"2");
    assert.equal(await mobile.locator(".site-scout svg").count(),1);
    for (const viewport of [{width:390,height:844},{width:1280,height:800}]) {
      await mobile.setViewportSize(viewport);
      const track = await mobile.locator("#site-scout").evaluate(el=>{
        const a=el.getAnimations()[0]; if(!a) throw Error("Missing patrol animation"); a.pause();
        const out=[0,8000,14400,24000].map(t=>{a.currentTime=t;const b=el.getBoundingClientRect();return {x:b.x,y:b.y,r:b.right,b:b.bottom};});a.play();return out;
      });
      assert.ok(Math.max(...track.map(p=>p.x))-Math.min(...track.map(p=>p.x))>viewport.width*.5);
      assert.ok(Math.max(...track.map(p=>p.y))-Math.min(...track.map(p=>p.y))>viewport.height*.5);
      assert.ok(track.every(p=>p.x>=0&&p.y>=0&&p.r<=viewport.width+1&&p.b<=viewport.height+1));
    }
    await mobile.setViewportSize({width:390,height:844});
    await mobile.locator("#scout-motion").click();
    assert.equal(await mobile.locator("#scout-motion").getAttribute("aria-pressed"),"true");
    assert.equal(await mobile.locator("#site-scout").evaluate(el=>getComputedStyle(el).animationPlayState),"paused");
    assert.equal(await mobile.locator("#site-scout").evaluate(el=>getComputedStyle(el).pointerEvents),"none");
    await mobile.locator("#scout-motion").click();
    await mobile.emulateMedia({reducedMotion:"reduce"});
    assert.equal(await mobile.locator("#site-scout").evaluate(el=>getComputedStyle(el).animationName),"none");
    await mobile.emulateMedia({reducedMotion:"no-preference"});
    check("Site Scout traverses both viewport axes on desktop and mobile, remains in bounds, cannot intercept taps, pauses and respects reduced motion");
    check("Default map excludes Completed and highlights only two sites with reviewed work/materials; quiet dots are subdued");
    const counts = await mobile.locator("[data-status-count]").allTextContents();
    assert.deepEqual(counts,["4","1","1","1","1","1"]);
    check("390px phone exposes completed only via explicit filter, with four default current pins");
    const colours = await markerColours(mobile);
    assert.equal(colours.find(p=>p.title.includes("Demo construction")).colour,"#246b9a");
    assert.equal(colours.find(p=>p.title.includes("Demo approval")).colour,"#a94b10");
    assert.equal(colours.find(p=>p.title.includes("Demo status hidden")).colour,"#667775");
    assert.equal(await mobile.locator("#company-legend li").count(),3);
    assert.ok(!(await mobile.locator("#company-legend").textContent()).includes("PRIVATE ORGANIZATION"));
    await mobile.locator("#company-filter").selectOption("ORG-000002");
    assert.equal((await statusInfo(mobile)).pins,1);
    assert.equal(await mobile.locator("#company-legend li").count(),1);
    assert.equal((await markerColours(mobile))[0].colour,"#a94b10");
    await mobile.locator("#reset-filters").click();
    check("company colours and filtered legend preserve public names and neutral private-organization fallback");

    for(const [status,count] of [["Completed",1],["Approval",1],["Construction",1],["Maintenance",1],["unpublished",1],["all",4]]){
      await mobile.locator('[data-project-status="'+status+'"]').click();
      const info=await statusInfo(mobile);
      assert.equal(info.projectCount,String(count),status);
      assert.equal(info.cards,count,status);
      assert.equal(info.pins,count,status);
      assert.equal(info.filter,status,status);
      assert.deepEqual(info.active,[status],status);
      assert.ok(info.summary.includes(status==="unpublished"?"Not stated":status==="all"?"Current sites":status==="Construction"?"Under construction":status));
      const button = mobile.locator('[data-project-status="'+status+'"]');
      assert.ok((await button.boundingBox()).height>=44,"Touch target below 44px");
    }
    check("touch controls switch actual map marker counts and project lists; show/not-stated preserved");

    await mobile.locator('[data-project-status="Approval"]').focus();
    await mobile.keyboard.press("Enter");
    assert.equal((await statusInfo(mobile)).filter,"Approval");
    await mobile.locator(".advanced-map-settings summary").click();
    await mobile.locator('[data-map-mode="work"]').click();
    assert.equal((await statusInfo(mobile)).projectCount,"1");
    assert.equal((await markerColours(mobile))[0].colour,"#a94b10");
    check("keyboard activation and map-layer switching preserve status");

    await mobile.locator("#reset-filters").click();
    assert.equal((await statusInfo(mobile)).projectCount,"4");
    assert.equal((await statusInfo(mobile)).filter,"all");
    assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth+2));
    assert.equal(await mobile.locator("#project-list").isVisible(),false);
    await mobile.locator("#directory-toggle").click();
    assert.equal(await mobile.locator("#project-list").isVisible(),true);
    await mobile.locator("#directory-toggle").click();
    assert.equal(await mobile.locator("#project-list").isVisible(),false);
    check("clear filters resets both controls; no horizontal page overflow");

    const remote = await mobile.request.get(ORIGIN+"/operations.json");
    const raw=await remote.text();
    assert.ok(!raw.includes("HIDDEN_RAW_STATUS_DO_NOT_PUBLISH"));
    assert.ok(!raw.includes("PRIVATE DEMO MUST NEVER PUBLISH"));
    check("private row and unapproved lifecycle status excluded in publication fixture");

    const desk=await browser.newPage({viewport:{width:1280,height:800}});
    await ready(desk);
    assert.equal(await desk.locator("#status-filter").isVisible(),true);
    assert.equal(await desk.locator("#navigation-panel").evaluate(el=>getComputedStyle(el).position),"sticky");
    check("desktop site navigator stays sticky while content scrolls");
    assert.equal((await statusInfo(desk)).pins,4);
    await desk.locator("#project-filter").selectOption("PRJ-999902");
    assert.equal((await statusInfo(desk)).pins,1);
    assert.ok((await markerColours(desk))[0].title.includes("Demo completed"));
    await desk.locator("#reset-filters").click();

    assert.equal(await desk.locator(".mobile-status-filter").isVisible(),false);
    await desk.locator("#status-filter").selectOption("Completed");
    assert.equal((await statusInfo(desk)).projectCount,"1");
    assert.equal((await statusInfo(desk)).pins,1);
    await desk.locator("#status-filter").selectOption("unpublished");
    assert.equal((await statusInfo(desk)).projectCount,"1");
    await desk.locator("#project-filter").selectOption("PRJ-999901");
    assert.equal((await statusInfo(desk)).filter,"all");
    assert.equal((await statusInfo(desk)).projectCount,"1");
    check("1280px desktop select matches mobile categories; direct project selection clears conflicting status");

    await mobile.locator("#reset-filters").click();
    assert.equal(await mobile.locator("#notice-total").textContent(),"1");
    assert.ok(await mobile.locator("#map").evaluate(el => el.compareDocumentPosition(document.querySelector("#notifications")) & Node.DOCUMENT_POSITION_FOLLOWING));
    assert.equal(await mobile.locator("#notifications").isVisible(),false);
    assert.equal(await mobile.locator("#notice-list .notice-item").count(),1);
    assert.deepEqual(await mobile.locator("[data-notice-count]").allTextContents(),["3","1","1","1"]);
    assert.equal(await mobile.locator(".notice-category-tabs button:visible").count(),0);
    check("Map is first, source notice detail hidden until site selection");

    await mobile.locator('.compact-nav a[href="./#notifications"]').click();
    assert.equal(await mobile.locator("#notifications").isVisible(),true);
    await mobile.locator('[data-notice-category="Materials"]').click();
    assert.equal(await mobile.locator("#notice-list .notice-item").count(),1);
    assert.ok((await mobile.locator("#notice-list").textContent()).includes("Synthetic materials instruction"));
    assert.equal(await mobile.locator(".notice-category-tabs button:visible").count(),2);
    await mobile.locator("#project-filter").selectOption("PRJ-999901");
    assert.equal((await statusInfo(mobile)).pins,1);
    assert.equal(await mobile.locator("#notice-list .notice-item").count(),1);
    assert.equal(await mobile.locator("#notice-focus-title").textContent(),"Demo construction");
    await mobile.locator('[data-notice-category="Work"]').click();
    assert.equal(await mobile.locator("#notice-list .notice-item").count(),1);
    check("site selection and category filtering show only reviewed notifications for that site");

    await mobile.locator("#reset-filters").click();
    await mobile.locator("#resource-view").click();
    assert.equal(await mobile.locator("#resource-desk").isVisible(),true);
    assert.equal(await mobile.locator("#map-title").textContent(),"Materials & Labour");
    assert.equal(await mobile.locator("#map-canvas").isVisible(),false);
    assert.equal(await mobile.locator("#notifications").isVisible(),false);
    assert.equal(await mobile.locator(".resource-table tbody tr").count(),1);
    assert.ok((await mobile.locator(".resource-table").textContent()).includes("Synthetic materials instruction"));
    assert.ok((await mobile.locator(".resource-table").textContent()).includes("12 · bags"));
    assert.ok(!(await mobile.locator(".resource-table").textContent()).includes("Synthetic site-supervision note"));
    assert.equal(await mobile.locator("#resource-desk .resource-row-details").getAttribute("open"),null);
    await mobile.locator("#resource-desk .resource-row-details summary").click();
    assert.equal(await mobile.locator("#resource-desk .resource-row-details p").first().isVisible(),true);
    await mobile.locator("#resource-site").selectOption("PRJ-999901");
    assert.equal(await mobile.locator(".resource-table").count(),0);
    await mobile.locator("#resource-site").selectOption("");
    await mobile.locator('[data-resource-tab="stock"]').click();
    assert.ok((await mobile.locator("#resource-rows").textContent()).includes("No verified public"));
    await mobile.locator('[data-resource-tab="labour"]').click();
    assert.ok((await mobile.locator("#resource-rows").textContent()).includes("No approved public labour-demand"));
    assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
    await mobile.locator("#geo-view").click();
    assert.equal(await mobile.locator("#map-canvas").isVisible(),true);
    check("Resource desk defaults to actual material notes, preserves recorded quantity and unit, details collapsed, explicit unknown stock/labour and map restored");
    await mobile.evaluate(() => {
      const pin = window.__qaMarkers.find(x => x.title.includes("Demo approval"));
      if (!pin || typeof pin.click !== "function") throw Error("Map marker test hook missing");
      pin.click();
    });
    assert.equal(await mobile.locator("#project-filter").inputValue(),"");
    assert.equal((await statusInfo(mobile)).pins,4);
    assert.equal(await mobile.locator("#notice-site").inputValue(),"PRJ-999903");
    assert.equal(await mobile.locator("#notice-list .notice-item").count(),1);
    assert.ok((await mobile.locator("#notice-list").textContent()).includes("Synthetic materials instruction"));
    check("clicking map marker opens site notice desk without removing adjacent pins");
    assert.equal(await mobile.locator("#notifications").isVisible(),true);
    const fitsBefore=await mobile.evaluate(()=>window.__qaFitBoundsCalls);
    await mobile.evaluate(()=>window.__qaMapHandlers.click());
    assert.equal(await mobile.locator("#notifications").isVisible(),false);
    assert.equal((await statusInfo(mobile)).pins,4);
    assert.equal(await mobile.evaluate(()=>window.__qaFitBoundsCalls),fitsBefore);
    check("tapping blank map dismisses detail without recentering the camera");
    await mobile.evaluate(() => window.__qaMarkers.find(x=>x.title.includes("Demo approval")).click());
    await mobile.keyboard.press("Escape");
    assert.equal(await mobile.locator("#notifications").isVisible(),false);
    check("Escape closes selected details and preserves all map markers");
    await mobile.evaluate(() => window.__qaMarkers.find(x=>x.title.includes("Demo approval")).click());
    await mobile.locator("#back-to-sites").click();
    assert.equal(await mobile.locator("#notifications").isVisible(),false);
    assert.equal((await statusInfo(mobile)).pins,4);
    check("explicit Back to all sites returns to map");

    const progResponse = await mobile.request.get(ORIGIN+"/progress.html");
    const srcResponse = await mobile.request.get(ORIGIN+"/sources.html");
    assert.equal(progResponse.status(),200);
    assert.equal(srcResponse.status(),200);
    const prog=await browser.newPage({viewport:{width:390,height:844},isMobile:true});
    await prog.goto(ORIGIN+"/progress.html?project=PRJ-999901",{waitUntil:"domcontentloaded"});
    await prog.waitForFunction(()=>document.querySelector("#report-count")?.textContent==="1");
    assert.equal(await prog.locator("#progress-project").inputValue(),"PRJ-999901");
    assert.equal(await prog.locator("#progress-list .card").count(),1);
    assert.equal(await prog.locator('#progress').count(),1);
    check("Daily Progress opens on a separate internal page with project query preservation");
    await prog.goto(ORIGIN+"/sources.html",{waitUntil:"domcontentloaded"});
    await prog.waitForFunction(()=>document.querySelector("#source-project-count")?.textContent==="5");
    assert.ok((await prog.locator("#source-notice-count").textContent()).includes("3 reviewed notifications"));
    assert.equal(await prog.locator("h1").textContent(),"Sources & history");
    assert.ok(!(await prog.locator("#source-dates").textContent()).includes("NOT_AVAILABLE_WITH_CURRENT_SHEETS_READONLY_SCOPE"));
    const sourceOverflow = await prog.evaluate(() => ({
      doc:document.documentElement.scrollWidth, view:innerWidth,
      maxTextRight:Math.max(...[...document.querySelectorAll(".source-date-grid dd")].map(e=>e.getBoundingClientRect().right))
    }));
    assert.ok(sourceOverflow.doc <= sourceOverflow.view+2,JSON.stringify(sourceOverflow));
    assert.ok(sourceOverflow.maxTextRight<=sourceOverflow.view+2,JSON.stringify(sourceOverflow));
    check("iPhone Sources stays readable without overlay menu or clipped source text");
    await prog.locator('.compact-nav a[href="./extraction.html"]').click();
    await prog.waitForFunction(()=>document.querySelector("#updates-stats .updates-stat strong")?.textContent==="3");
    assert.equal(await prog.locator(".extract-lane").count(),0);
    assert.equal(await prog.locator("#updates-stats .updates-stat").count(),3);
    assert.ok((await prog.locator("#updates-meaning").textContent()).includes("3 work report") ||
              (await prog.locator("#updates-meaning").textContent()).includes("1 work report"));
    assert.equal(await prog.locator("#updates-sites .updates-site").count()>0,true);
    await prog.locator("#updates-project").selectOption("PRJ-999901");
    assert.equal(await prog.locator("#updates-stats .updates-stat").nth(0).locator("strong").textContent(),"2");
    assert.ok((await prog.locator("#updates-meaning").textContent()).includes("Closure is not confirmed"));
    assert.ok(await prog.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
    check("Site updates derives site-by-site reviewed instructions, verification limits and source dates");
    await prog.setViewportSize({width:320,height:710});
    assert.ok(await prog.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
    check("320px phone uses three compact tabs and site update cards without horizontal scrolling");
    await prog.locator('a[href="./closed-work.html"]').first().click();
    await prog.waitForFunction(()=>document.querySelector("#closed-total")?.textContent==="1");
    assert.equal(await prog.locator("#closed-completed").textContent(),"1");
    assert.equal(await prog.locator("#closed-unneeded").textContent(),"0");
    assert.equal(await prog.locator(".closure-item").count(),1);
    assert.ok((await prog.locator(".closure-item").textContent()).includes("Synthetic verified completed report"));
    assert.ok(await prog.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
    await prog.locator("#closed-decision").selectOption("NOT_REQUIRED");
    assert.equal(await prog.locator(".closure-item").count(),0);
    await prog.locator("#closed-decision").selectOption("COMPLETED");
    assert.equal(await prog.locator(".closure-item").count(),1);
    check("320px dedicated closed-work archive shows only reviewed synthetic completions and filters correctly");
    await prog.close();

    assert.equal(await desk.request.get(ORIGIN+"/memory-wall.html").then(r=>r.status()),200);
    check("published Memory Wall route available in static QA artifact");
    await mobile.close();await desk.close();
    // iPhone-like WebKit engine smoke: this is not a claim of physical-device QA.
    const safari = await webkit.launch({headless:true});
    try {
      const phone = await safari.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
      await ready(phone);
      assert.equal(await phone.locator(".phone-menu").count(),0);
      assert.equal(await phone.locator(".compact-nav a:visible").count(),2);
      assert.equal(await phone.locator("#navigation-panel").isVisible(),false);
      const scoutTrack=await phone.locator("#site-scout").evaluate(el=>{const a=el.getAnimations()[0];if(!a)throw Error("Safari patrol missing");a.pause();const out=[0,9000,15500].map(t=>{a.currentTime=t;const b=el.getBoundingClientRect();return [b.x,b.y,b.right,b.bottom];});a.play();return out;});
      assert.ok(Math.max(...scoutTrack.map(p=>p[0]))-Math.min(...scoutTrack.map(p=>p[0]))>190);
      assert.ok(Math.max(...scoutTrack.map(p=>p[1]))-Math.min(...scoutTrack.map(p=>p[1]))>420);
      assert.ok(scoutTrack.every(p=>p[0]>=0&&p[1]>=0&&p[2]<=391&&p[3]<=845));
      check("WebKit real animation coordinates move across both axes and stay on mobile screen");
      assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
      await phone.locator('.compact-nav a[href="./#notifications"]').click();
      assert.equal(await phone.locator("#notifications").isVisible(),true);
      await phone.goto(ORIGIN+"/sources.html",{waitUntil:"domcontentloaded"});
      await phone.waitForFunction(()=>document.querySelector("#source-project-count")?.textContent==="5");
      assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
      await phone.locator('.compact-nav a[href="./extraction.html"]').click();
      await phone.waitForFunction(()=>document.querySelector("#updates-stats .updates-stat strong")?.textContent==="3");
      assert.equal(await phone.locator(".extract-lane").count(),0);
      assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
      await phone.locator("#updates-project").selectOption("PRJ-999901");
      assert.equal(await phone.locator("#updates-stats .updates-stat").nth(0).locator("strong").textContent(),"2");
      await phone.goto(ORIGIN+"/closed-work.html");
      await phone.waitForFunction(()=>document.querySelector("#closed-total")?.textContent==="1");
      assert.equal(await phone.locator(".closure-item").count(),1);
      assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
      await phone.close();
      check("WebKit mobile engine: simple tabs, notifications, source wrapping and site-derived updates usable");
    } finally { await safari.close(); }
    console.log("STATUS_BROWSER_QA_PASS checks="+seen.length);
  } finally {await browser.close()}
})().catch(error=>{console.error(error.stack||error);process.exit(1)});
