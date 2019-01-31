// const Axios = require('axios');
// const Cheerio = require('cheerio');
const { spawn } = require('child_process');
const url = require('url');
const path = require('path');
const fs = require('fs');

const scrapers = {
  'amazon.com': 'amazon'
}

function walkSync(dir) {
  if(dir.indexOf('node_modules') > -1 || dir.indexOf('.git') > -1){
    return dir;
  }
  if (!fs.lstatSync(dir).isDirectory()) return dir;

  return fs.readdirSync(dir).map(f => walkSync(path.join(dir, f))); // `join("\n")`
}

console.log(walkSync(__dirname+'/../'));

// function parseReviews(data){
//   //Cheerio.load(body)
//   console.log(data);
//   return Promise.resolve(data);
// }

function scrapeReviews(req, res){
  const productUrl = req.query.url;
  const callbackUrl = req.query.callbackUrl;

  let { hostname } = url.parse(productUrl);
  hostname = hostname.replace(/^www\./, '');
  
  if(!hostname){
    res.status(400).send('API must be called with a url query parameter which matches a webpage.');
    return;
  }

  const selectedScraper = scrapers[hostname];

  if(!selectedScraper){
    res.status(404).send(`Domain ${hostname} is unknown.`);
    return;
  }

  res.setHeader('Content-Type', 'application/json');

  // const scraperFilePath = path.resolve(path.join('/tmp', 'scrapers', `${selectedScraper}-scraper.js`));
  const scraperFilePath = `${__dirname}/scrapers/${selectedScraper}-scraper.js`;
  // const directory = path.resolve(__dirname);
  console.log(`Calling ${scraperFilePath}`, __dirname, path.resolve(__dirname));
  const scraperProc = spawn(
    process.execPath, 
    [`${scraperFilePath}`, '--url', productUrl, '--callback', callbackUrl],
    {
      // if run under node (process.execPath points to node.exe),
      // then node ignores PKG_EXECPATH, but if run as pkged app,
      // PKG_INVOKE_NODEJS is a hack to access internal nodejs
      env: { 
        PKG_EXECPATH: 'PKG_INVOKE_NODEJS',
        NODE_PATH: `${__dirname}/../node_modules`
      }
    }
  );

  let body = '';
  scraperProc.stdout.on('data', (data) => {
    body += data;
    // res.write(data);
    // res.write(data.json());
  });

  scraperProc.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);
    // res.write(data);
  });

  // scraperProc.on('close', (code) => {
  //   console.log(`child process exited with code ${code}`);
  //   res.end();
  // });

  scraperProc.on('exit', (code) => {
    console.log(`child process exited with code ${code}`);
    // const parsed = JSON.parse(body);
    // const reviewsStartMessage = '<<<REVIEWS>>>';
    // body = body.substring(body.indexOf(reviewsStartMessage) + reviewsStartMessage.length);
    // res.write(body);
    // res.end();
    let result = null;
    try{
      result = JSON.parse(body)
    } catch(err){
      result = body;
    }
    res.json(result);
  });

  // return new Promise((resolve, reject) => {
  //   Axios.get(productUrl, {withCredentials: true})
  //     .then(({ data: body }) => {
  //       console.log("got data", body);
  //       return parseReviews(body);
  //     })
  //     .catch((error) => {
  //       console.warn(error);

  //       reject(new Error(`No reviews for url ${productUrl}`));
  //     });
  // });
}

module.exports = {
  scrapeReviews
};
