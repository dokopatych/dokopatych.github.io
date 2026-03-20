const fs = require('fs');
const path = require('path');
const { popularMovies } = require('./movies.js');

const ROOT = __dirname;
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

const MEDIA_COPY = {
  movie: {
    nounAccusative: 'фильм',
    nounGenitive: 'фильма',
    nounPlural: 'фильмы',
    headingPlural: 'фильмы',
    applicationName: 'Докопатыч | Поиск фильмов',
    telegramType: 'movie',
  },
  tv: {
    nounAccusative: 'сериал',
    nounGenitive: 'сериала',
    nounPlural: 'сериалы',
    headingPlural: 'сериалы',
    applicationName: 'Докопатыч | Поиск сериалов',
    telegramType: 'tv',
  },
};

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

function resolveMediaType(mediaType) {
  return mediaType === 'tv' ? 'tv' : 'movie';
}

function resolveMediaCopy(mediaType) {
  return MEDIA_COPY[resolveMediaType(mediaType)];
}

function movieDeepLink(movie) {
  const media = resolveMediaCopy(movie.media_type);
  return `https://t.me/getTorrentFileBot?start=searchTr-${movie.id}-${media.telegramType}-lnd`;
}

function buildIntentConfig(movie) {
  const quotedTitle = `«${movie.title}»`;
  const media = resolveMediaCopy(movie.media_type);

  return {
    title: `Скачать ${media.nounAccusative} ${quotedTitle} — через Telegram-бота | Докопатыч`,
    url: `${BASE_URL}/${moviePagePath(movie.id)}`,
    h1: `Скачать ${media.nounAccusative} ${quotedTitle}`,
    h2: `Страница запроса: скачать ${media.nounAccusative} ${quotedTitle}`,
    description: `Низкочастотный запрос: скачать ${media.nounAccusative} ${quotedTitle}. Прямой переход в Telegram-бота к поиску конкретного ${media.nounGenitive} по ID ${movie.id}.`,
    queryExample: `скачать ${media.nounAccusative} ${movie.title}`,
    about: `Это страница под точечный запрос «скачать ${media.nounAccusative} ${movie.title}». По кнопке выше открывается готовый поиск ${media.nounGenitive} в Telegram-боте.`,
    queries: `Подходят запросы: скачать ${media.nounAccusative} ${movie.title}, ${movie.title} торрент, ${movie.title} ${media.nounAccusative} скачать, ${movie.title} Telegram.`,
    flow: `Страница ведёт в Telegram-бота, где заранее подставлен ID ${media.nounGenitive}. Это сокращает путь от запроса до релевантной выдачи.`,
    popularTitle: `Популярные ${media.headingPlural} недели`,
    applicationName: media.applicationName,
  };
}

function buildMoviePageHtml(movie) {
  const config = buildIntentConfig(movie);
  const configJson = JSON.stringify(config);

  return `<!doctype html>
<html lang="ru">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="analytics.js"></script>
    <title>${escapeHtml(config.title)}</title>
    <meta name="description" content="${escapeHtml(config.description)}" />
    <meta name="application-name" content="${escapeHtml(config.applicationName)}" />
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
            <h1 class="description" data-h1>${escapeHtml(config.h1)}</h1>
            <div class="btns-container">
                <a href="${movieDeepLink(movie)}" class="start-btn" target="_blank" rel="noopener">ОТКРЫТЬ В TELEGRAM</a>
            </div>
        </div>
        <div class="faq" data-faq></div>
        <div class="faq">
            <div class="faqCard"><h3>${escapeHtml(config.popularTitle)}</h3><ul data-popular-movies></ul></div>
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

function flattenPopularMovies(source) {
  return source.flat(Infinity).filter((item) => item && typeof item === 'object' && item.id && item.title);
}

function writeMoviePages() {
  flattenPopularMovies(popularMovies).forEach((movie) => {
    const filePath = path.join(ROOT, moviePagePath(movie.id));
    fs.writeFileSync(filePath, buildMoviePageHtml(movie));
  });
}

function buildSitemapEntry({ loc, changefreq, priority }) {
  return `  <url><loc>${loc}</loc><lastmod>${TODAY}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

function writeSitemap() {
  const moviePages = flattenPopularMovies(popularMovies).map((movie) => ({
    loc: `${BASE_URL}/${moviePagePath(movie.id)}`,
    changefreq: 'weekly',
    priority: '0.7',
  }));

  const entries = [...SEO_BASE_PAGES, ...moviePages].map(buildSitemapEntry).join('\n');
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
  fs.writeFileSync(SITEMAP_PATH, sitemap);
}

const flatPopularMovies = flattenPopularMovies(popularMovies);
writeMoviePages();
writeSitemap();

console.log(`Generated ${flatPopularMovies.length} SEO pages and refreshed sitemap.`);
