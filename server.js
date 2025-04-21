const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

// Allow frontend to access
app.use(cors());

// Proxy route
app.get('/proxy', async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).send('Missing URL parameter');
  }

  try {
    const response = await fetch(url);
    const contentType = response.headers.get('content-type');

    if (!response.ok) {
      return res.status(500).send('Failed to fetch the URL');
    }

    const html = await response.text();

    // Rewrite links if it's HTML content
    if (contentType && contentType.includes('text/html')) {
      const $ = cheerio.load(html);

      // Rewrite all <link>, <script>, <img>, and other src/href attrs
      $('link[href], script[src], img[src], iframe[src]').each((_, el) => {
        const $el = $(el);
        const attr = $el.is('link') || $el.is('a') ? 'href' : 'src';
        const original = $el.attr(attr);

        if (original && !original.startsWith('http') && !original.startsWith('//')) {
          const base = new URL(url);
          const absolute = new URL(original, base).toString();
          $el.attr(attr, absolute);
        }
      });

      res.send($.html());
    } else {
      res.set('Content-Type', contentType);
      const buffer = await response.buffer();
      res.send(buffer);
    }

  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching page');
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server listening on port ${PORT}`);
});
