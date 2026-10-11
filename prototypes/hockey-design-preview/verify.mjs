import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
const origin = process.env.PREVIEW_URL || 'http://localhost:5194';
const output = fileURLToPath(new URL('../../docs/design/hockey-design-preview/', import.meta.url));
await mkdir(output, { recursive: true });
const report = { origin, checkedAt: new Date().toISOString(), pages: [], checks: [], errors: [] };
const browser = await chromium.launch();
function check(name, condition) { assert.ok(condition, name); report.checks.push(name); }
try {
  for (const width of [1440, 390, 320]) {
    for (const theme of ['dark', 'light']) {
      const context = await browser.newContext({viewport:{width,height:width===1440?1000:844},hasTouch:width<500});
      await context.addInitScript((value) => localStorage.setItem('hockey-design-117-theme',JSON.stringify(value)),theme);
      const page = await context.newPage();
      page.on('pageerror',error=>report.errors.push(error.message));
      for (const route of ['home','game']) {
        await page.goto(`${origin}/#${route}`);
        await page.evaluate(()=>document.fonts.ready);
        await page.waitForTimeout(700);
        const measurements = await page.evaluate(()=>({
          theme:document.documentElement.dataset.theme,
          width:innerWidth, scrollWidth:document.documentElement.scrollWidth,
          rinkLabels:[...document.querySelectorAll('.rink-direction,.rink-legend,.score-middle .clock')].map(element=>({class:element.className,size:parseFloat(getComputedStyle(element).fontSize)})),
          tinyControls:[...document.querySelectorAll('button')].filter(element=>{const rect=element.getBoundingClientRect();return rect.height>0&&rect.height<44;}).map(element=>element.textContent),
          brokenImages:[...document.images].filter(image=>!image.complete||image.naturalWidth===0).length,
        }));
        check(`${route} ${theme} ${width}: no horizontal overflow`,measurements.scrollWidth<=width);
        check(`${route} ${theme} ${width}: theme applied`,measurements.theme===theme);
        check(`${route} ${theme} ${width}: local assets loaded`,measurements.brokenImages===0);
        check(`${route} ${theme} ${width}: controls at least 44px tall`,measurements.tinyControls.length===0);
        if(route==='game')check(`${route} ${theme} ${width}: rink labels and clock at least 12px`,measurements.rinkLabels.every(item=>item.size>=12));
        const screenshot=`${route}-${theme}-${width}.png`;
        await page.screenshot({path:`${output}/${screenshot}`,fullPage:true});
        report.pages.push({route,width,theme,screenshot,...measurements});
      }
      await context.close();
    }
  }
  const context = await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});
  const page = await context.newPage();
  page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto(`${origin}/#home`);
  check('Home has stable start-time order',await page.locator('.game-row').evaluateAll(rows=>rows.map(row=>row.getAttribute('href')).join(',')==='#game,#match/bos-nyr,#match/dal-buf,#match/chi-njd'));
  await page.locator('[data-filter="live"]').tap();
  check('Live filter shows exactly two sample games',await page.locator('.game-row').count()===2);
  await page.locator('[data-filter="favorites"]').tap();
  check('Favorites filter shows selected teams',await page.locator('.game-row').count()===1);
  await page.locator('[data-nav="teams"]').tap();
  await page.locator('[data-favorite="TOR"]').tap();
  await page.locator('[data-favorite="NSH"]').tap();
  await page.reload();
  check('Favorite removal persists after reload',await page.locator('[data-favorite="TOR"]').getAttribute('aria-pressed')==='false');
  await page.locator('[data-nav="scores"]').tap();
  await page.locator('[data-filter="favorites"]').tap();
  check('Empty favorites gives an actionable empty state',await page.locator('.empty a').getAttribute('href')==='#teams');
  await page.locator('[data-filter="all"]').tap();
  check('Filtering restores original game order',await page.locator('.game-row').first().getAttribute('href')==='#game');
  await page.locator('.game-row').first().tap();
  await page.locator('#rink-wrap').waitFor();
  check('Home/slate link opens complete game',await page.locator('#rink-wrap').isVisible());
  check('Reduced motion disables reveal and shot animation',await page.evaluate(()=>[...document.querySelectorAll('.reveal,.shot-line')].every(element=>getComputedStyle(element).animationName==='none')));
  check('Replay starts paused',await page.locator('[data-action="play"]').textContent()==='▶ REPLAY');
  await page.locator('[data-event="1"]').tap();
  check('Touch event selection updates rink, score and clock',await page.locator('.rink').getAttribute('data-event-kind')==='save'&&await page.locator('#home-score').textContent()==='2'&&(await page.locator('#game-clock').textContent()).includes('09:51'));
  await page.locator('[data-event-filter="goals"]').tap();
  check('Goal filter has one linked selected play',await page.locator('.event').count()===1&&await page.locator('.event').getAttribute('aria-pressed')==='true'&&await page.locator('.rink').getAttribute('data-event-kind')==='goal');
  await page.locator('[data-action="prev"]').tap();
  check('Replay navigation restores all event rows',await page.locator('.event').count()===6&&await page.locator('[data-event="4"]').getAttribute('aria-pressed')==='true');
  await page.locator('#replay-range').focus();
  await page.keyboard.press('Home');
  check('Keyboard scrub selects first play',await page.locator('[data-event="0"]').getAttribute('aria-pressed')==='true');
  await page.keyboard.press('ArrowRight');
  check('Keyboard scrub advances one play',await page.locator('[data-event="1"]').getAttribute('aria-pressed')==='true');
  await page.locator('[data-tab="pick"]').tap();
  check('AI tab shows existing seeded 58% and honest labeling',(await page.locator('#game-content').innerText()).includes('58%')&&(await page.locator('.sample-tag').innerText()).includes('NOT A LIVE MODEL OUTPUT'));
  await page.locator('[data-tab="matchup"]').tap();
  check('Matchup tab exposes sample statistics',await page.locator('.stat').count()===4);
  await page.locator('[data-tab="plays"]').tap();
  check('Tab navigation preserves selected event',await page.locator('[data-event="1"]').getAttribute('aria-pressed')==='true');
  await page.locator('[data-action="play"]').tap();
  await page.waitForTimeout(1950);
  check('User-started replay advances a discrete event',await page.locator('[data-event="2"]').getAttribute('aria-pressed')==='true');
  await page.locator('[data-action="play"]').tap();
  await page.waitForTimeout(1950);
  check('Pause holds the selected event',await page.locator('[data-event="2"]').getAttribute('aria-pressed')==='true');
  await page.locator('[data-action="latest"]').tap();
  check('Latest returns to final demo snapshot',await page.locator('#game-mode').textContent()==='LATEST DEMO'&&await page.locator('#home-score').textContent()==='3');
  await page.locator('#theme-toggle').tap();
  await page.reload();
  check('Theme preference persists',await page.locator('html').getAttribute('data-theme')==='light');
  await page.locator('[data-nav="home"]').focus();
  await page.keyboard.press('Enter');
  await page.locator('.feature').waitFor();
  check('Keyboard primary navigation works',await page.locator('.feature').isVisible());
  await page.keyboard.press('Tab');
  check('Route change places keyboard at main content',await page.evaluate(()=>document.activeElement?.getAttribute('href')==='#game'));
  // Narrow secondary screens are checked without additional screenshot suites.
  await page.setViewportSize({width:320,height:844});
  for(const route of ['scores','teams','match/bos-nyr']){await page.goto(`${origin}/#${route}`);check(`${route} 320: no horizontal overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  check('No browser exceptions',report.errors.length===0);
  await context.close();
} finally {
  await browser.close();
  await writeFile(`${output}/verification.json`,`${JSON.stringify(report,null,2)}\n`);
}
console.log(`${report.checks.length} checks passed; ${report.pages.length} screenshots saved in ${output}`);
