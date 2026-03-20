const fs = require('fs');
const path = require('path');
const { popularMovies } = require('../movies.js');

const ROOT = path.resolve(__dirname, '..');
const BASE_URL = 'https://dokopatych.github.io';
const TODAY = new Date().toISOString().slice(0, 10);
const SITEMAP_PATH = path.join(ROOT, 'sitemap.xml');

const SEO_BASE_PAGES = [
  { loc: `${BASE_URL}/`, changefreq: 'daily', priority: '1.0' },
  { loc: `${BASE_URL}/music-search-bot.html`, changefreq: 'weekly', priority: '0.9' },
  { loc: `${BASE_URL}/audiobook-search-bot.html`, changefreq: 'weekly', priority: '0.9' },
  { loc: `${BASE_URL}/film-download-bot.html`, changefreq: 'weekly', priority: '0.9' },
  { loc: `${BASE_URL}/game-search-bot.html`, changefreq: 'weekly', priority: '0.9' },
  { loc: `${BASE_URL}/file-search-bot.html`, changefreq: 'weekly', priority: '0.9' },
  { loc: `${BASE_URL}/skachat-albom-artista.html`, changefreq: 'weekly', priority: '0.8' },
  { loc: `${BASE_URL}/skachat-audioknigu-nazvanie.html`, changefreq: 'weekly', priority: '0.8' },
  { loc: `${BASE_URL}/skachat-serial-nazvanie.html`, changefreq: 'weekly', priority: '0.8' },
];

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function moviePagePath(movieId) {
  return `skachat-film-${movieId}.html`;
}

function movieDeepLink(movieId) {
  return `https://t.me/getTorrentFileBot?start=searchTr-${movieId}-movie-lnd`;
}

function buildIntentConfig(movie) {
  const quotedTitle = `«${movie.title}»`;

  return {
    title: `Скачать фильм ${quotedTitle} — через Telegram-бота | Докопатыч`,
    url: `${BASE_URL}/${moviePagePath(movie.id)}`,
    h1: `Скачать фильм ${quotedTitle}`,
    h2: `Страница запроса: скачать фильм ${quotedTitle}`,
    description: `Низкочастотный запрос: скачать фильм ${quotedTitle}. Прямой переход в Telegram-бота к поиску конкретного фильма по ID ${movie.id}.`,
    queryExample: `скачать фильм ${movie.title}`,
    about: `Это SEO-страница под точечный запрос «скачать фильм ${movie.title}». По кнопке ниже открывается готовый поиск фильма в Telegram-боте.`,
    queries: `Подходят запросы: скачать фильм ${movie.title}, ${movie.title} торрент, ${movie.title} фильм скачать, ${movie.title} Telegram.`,
    flow: 'Страница ведёт в Telegram-бота, где заранее подставлен ID фильма. Это сокращает путь от запроса до релевантной выдачи.',
  };
}

function buildMoviePageHtml(movie) {
  const config = buildIntentConfig(movie);
  const safeTitle = escapeHtml(movie.title);
  const configJson = JSON.stringify(config);

  return `<!doctype html>
<html lang="ru">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="analytics.js"></script>
    <title>${escapeHtml(config.title)}</title>
    <meta name="description" content="${escapeHtml(config.description)}" />
    <meta name="application-name" content="Докопатыч | Поиск фильмов" />
    <meta property="og:title" content="${escapeHtml(config.title)}" />
    <meta property="og:site_name" content="Докопатыч" />
    <meta property="og:description" content="${escapeHtml(config.description)}" />
    <meta property="og:image" content="https://dokopatych.github.io/images/square.webp" />
    <meta property="og:url" content="${escapeHtml(config.url)}" />
    <meta property="og:type" content="website" />
    <link rel="canonical" href="${escapeHtml(config.url)}">
    <link rel="icon" href="https://dokopatych.github.io/images/round-sm.ico" type="image/x-icon">
    <link rel="shortcut icon" href="https://dokopatych.github.io/images/round-sm.ico" />
    <link rel="stylesheet" href="styles.css" />
    <script type="application/ld+json" data-jsonld></script>
</head>
<body>
    <div class="backGround"></div>
    <div class='column'>
        <div class="botCard">
            <img src="./images/round-sm.webp" alt="Аватар" class="avatar" />
            <span class="name">Докопатыч</span>
            <span class="username">@getTorrentFileBot</span>
            <h1 class="description" data-h1>Скачать фильм ${safeTitle}</h1>
            <div class="btns-container">
                <a href="${movieDeepLink(movie.id)}" class="start-btn" target="_blank" rel="noopener">ОТКРЫТЬ В TELEGRAM</a>
            </div>
        </div>
        <div class="faq" data-faq></div>
        <div class="faq">
            <div class="faqCard"><h3>Популярные фильмы недели</h3><ul data-popular-movies></ul></div>
        </div>
    </div>
    <script src="movies.js"></script>
    <script>
        window.INTENT_PAGE_CONFIG = ${configJson};
        window.FILM_DOWNLOAD_PAGE_CONFIG = {
            movies: (window.popularMovies || []).filter((movie) => movie.id !== ${movie.id}),
            limit: 10,
            linkType: 'intent',
            emptyText: 'Список скоро обновится.',
        };
    </script>
    <script src="seo-intent-page.js"></script>
</body>
</html>
`;
}

function writeMoviePages() {
  popularMovies.forEach((movie) => {
    const filePath = path.join(ROOT, moviePagePath(movie.id));
    fs.writeFileSync(filePath, buildMoviePageHtml(movie));
  });
}

function buildSitemapEntry({ loc, changefreq, priority }) {
  return `  <url><loc>${loc}</loc><lastmod>${TODAY}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

function writeSitemap() {
  const moviePages = popularMovies.map((movie) => ({
    loc: `${BASE_URL}/${moviePagePath(movie.id)}`,
    changefreq: 'weekly',
    priority: '0.7',
  }));

  const entries = [...SEO_BASE_PAGES, ...moviePages].map(buildSitemapEntry).join('\n');
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
  fs.writeFileSync(SITEMAP_PATH, sitemap);
}

writeMoviePages();
writeSitemap();

console.log(`Generated ${popularMovies.length} movie SEO pages and refreshed sitemap.`);
