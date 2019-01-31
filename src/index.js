const express = require('express');
const bodyParser = require('body-parser');
const scrapeReviews = require('./scraper').scrapeReviews;
require('./scrapers/amazon-scraper');

const app = express();
const port = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/api/reviews', (req, res) => {
  console.log("scraping...");
  return scrapeReviews(req, res);
});

app.get('*', function(req, res){
  res.status(404).send('Usage instructions: use /api/reviews?url=[amazonReviewUrl]');
});

app.listen(port, () => console.log(`Listening on port ${port}`));
