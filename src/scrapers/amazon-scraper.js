const puppeteer = require('puppeteer');
const argv = require('yargs').argv;
const math = require('mathjs');

const config =  require('../../config');

const url = argv.url || config.url;

(async () => {
  // console.time('Time to completion');
  let allReviews = [];
  const pageTimes = [];
  const browser = await puppeteer.launch({ 
    headless: true,
    dumpio: true
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 926 });

  async function readPage(pageUrl){
    // console.log("Navigation: ", pageUrl);
    // console.time('Navigation');
    const startTime = Date.now();
    // const parser = new UrlParse(pageUrl);

    await page.goto(pageUrl).catch((err) => {
      // console.log(err);
    });

    pageTimes.push(Date.now() - startTime);
    // console.timeEnd('Navigation');
  
    // This waits for a similar element on either the bot page or the review page.
    await page.waitForSelector('.a-row').catch((err) => {
      // console.log(err);
    });
  
    // If we see the bot page then we need to solve the captcha image.
    // TODO: solve the captcha (if/when it shows up)
    // let bodyHTML = await page.evaluate(() => document.body.innerHTML);
    // console.log(bodyHTML);

    const reviewElems = await page.$$('.review');

    for(let i = 0; i < reviewElems.length; i++){
      const reviewElem = reviewElems[i];
      const reviewJson = {};
      reviewJson.review = await (await (await reviewElem.$('.review-text')).getProperty('innerText')).jsonValue();
      reviewJson.author = await (await (await reviewElem.$('.a-profile-name')).getProperty('innerText')).jsonValue();
      reviewJson.stars = await (await (await reviewElem.$('.review-rating > .a-icon-alt')).getProperty('innerText')).jsonValue();
      reviewJson.starsValue = parseFloat(reviewJson.stars.substring(0, reviewJson.stars.indexOf(' ')));
      reviewJson.date = await (await (await reviewElem.$('.review-date')).getProperty('innerText')).jsonValue();
      const badgeElem = await reviewElem.$('[data-hook="avp-badge"]');

      let verified = false; 
      if(badgeElem){
        verified = await (await badgeElem.getProperty('innerText')).jsonValue();
      }
      reviewJson.verified = !!verified;
      allReviews.push(reviewJson);
    }

    const nextPage = await page.$('li.page-button.a-selected:not(.a-last):not(.page-ellipsis)');
    if(nextPage){
      const nextSibling = await nextPage.getProperty('nextSibling');
      if(nextSibling){
        const hyperlinkHandle = await nextSibling.$('a');
        if(hyperlinkHandle){
          const nextHref = await (await hyperlinkHandle.getProperty('href')).jsonValue();
          if(nextHref){
            await readPage(nextHref)
          }
        }
      }
    }
    
    return allReviews;
  }

  const reviews = await readPage(url).catch((err) => {
    // console.error(err);
    browser.close();
    process.exit(1);
  });

  const result = {
    reviews,
    averageStars: (reviews.reduce((accumulator, currentReview) => {
      return accumulator + currentReview.starsValue;
    }, 0) / reviews.length)
  }
  console.log(JSON.stringify(result));
  // console.timeEnd('Time to completion');
  // console.log("Navigation times:", JSON.stringify(pageTimes));
  // console.log("Average navigation time:", math.mean(pageTimes));
  // console.log("Standard Deviation:", math.mad(pageTimes));
  // console.log("Median:", math.median(pageTimes));
  // console.log("Min:", math.min(pageTimes));
  // console.log("Max:", math.max(pageTimes));
  // console.log("P95:", math.quantileSeq(pageTimes, 0.95));
  // console.log("P99:", math.quantileSeq(pageTimes, 0.99));
  browser.close();
})();
