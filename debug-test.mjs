import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });
await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

// Import 1 image
const fileInput = await page.$('#file-input');
await fileInput.uploadFile('D:\\hyjar\\照片\\自然风光\\Z30_0488.png');
await page.waitForFunction(() => document.querySelectorAll('.thumbnail').length > 0, { timeout: 30000 });

// Check state before layout
const before = await page.evaluate(() => window.__photoAlbum.getState());
console.log('=== Before layout ===');
console.log('template:', before.template);
console.log('fitMode:', before.fitMode);
console.log('autoOrient:', before.autoOrient);
console.log('images:', before.images.length);
console.log('pageSize:', before.pageSize);
console.log('orientation:', before.orientation);

// Auto layout
await page.click('#btn-auto-layout');
await page.waitForFunction(() => document.querySelectorAll('.preview-page').length > 0, { timeout: 10000 });

// Check result
const result = await page.evaluate(() => {
  const s = window.__photoAlbum.getState();
  const p = s.pages[0];
  const e = p?.elements?.[0];
  const img = s.images[0];
  return {
    pageCount: s.pages.length,
    pageWidth: p?.width,
    pageHeight: p?.height,
    elemX: e?.x,
    elemY: e?.y,
    elemW: e?.w,
    elemH: e?.h,
    imgAspect: img?.aspectRatio,
    imgNaturalW: img?.naturalW,
    imgNaturalH: img?.naturalH,
  };
});
console.log('\n=== Layout result ===');
console.log(JSON.stringify(result, null, 2));

// Check actual DOM element
const dom = await page.evaluate(() => {
  const elem = document.querySelector('.preview-element');
  if (!elem) return { error: 'no element found' };
  const computed = window.getComputedStyle(elem);
  return {
    dataElemId: elem.getAttribute('data-elem-id'),
    inlineStyle: elem.getAttribute('style'),
    computedW: computed.width,
    computedH: computed.height,
    computedLeft: computed.left,
    computedTop: computed.top,
    computedPosition: computed.position,
    computedOverflow: computed.overflow,
    parentClass: elem.parentElement?.className,
    parentW: elem.parentElement?.clientWidth,
    parentH: elem.parentElement?.clientHeight,
    imgSrc: elem.querySelector('img')?.src?.substring(0, 80),
    imgComputedW: window.getComputedStyle(elem.querySelector('img'))?.width,
    imgComputedH: window.getComputedStyle(elem.querySelector('img'))?.height,
  };
});
console.log('\n=== DOM element ===');
console.log(JSON.stringify(dom, null, 2));

await browser.close();
