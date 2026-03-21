const COMMON_NAV_LINKS = [
  { href: '/', label: 'Главная страница' },
  { href: '/pages/music-search-bot.html', label: 'Поиск музыки' },
  { href: '/pages/audiobook-search-bot.html', label: 'Поиск аудиокниг' },
  { href: '/pages/film-download-bot.html', label: 'Поиск фильмов и сериалов' },
  { href: '/pages/game-search-bot.html', label: 'Поиск игр и программ' },
  { href: '/pages/file-search-bot.html', label: 'Поиск файлов и медиа' },
];

const TELEGRAM_MOVIE_SEARCH_PREFIX = 'https://t.me/DokopatychBot?start=searchTr-';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function fillMeta(config) {
  document.title = config.title;
  const set = (selector, attr, value) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute(attr, value);
  };

  set('meta[name="description"]', 'content', config.description);
  set('meta[property="og:title"]', 'content', config.title);
  set('meta[property="og:description"]', 'content', config.description);
  set('meta[property="og:url"]', 'content', config.url);
  set('link[rel="canonical"]', 'href', config.url);
}

function renderFaq(config) {
  const faq = document.querySelector('[data-faq]');
  if (!faq) return;

  const cloudItems = Array.isArray(config.tagCloudQueries) ? config.tagCloudQueries : [];
  const cloudCard = cloudItems.length
    ? `<div class="faqCard"><h3>${escapeHtml(config.tagCloudTitle || 'Облако запросов')}</h3><div class="neon-tag-cloud">${cloudItems
        .map((query) => `<span class="neon-tag">${escapeHtml(query)}</span>`)
        .join('')}</div></div>`
    : '';

  const cards = [
    `<div class="faqCard"><h2>${config.h2}</h2><p>${config.description}</p></div>`,
    `<div class="faqCard"><h3>Как скачать</h3><p>${config.about}</p></div>`,
    `<div class="faqCard"><h3>Как работает бот</h3><p>${config.flow}</p></div>`,
    `<div class="faqCard"><h3>Навигация</h3><ul>${COMMON_NAV_LINKS.map((l) => `<li><a href="${l.href}">${l.label}</a></li>`).join('')}</ul></div>`,
    `<div class="faqCard"><h3>Какие запросы подходят</h3><p>${config.queries}</p></div>`,
    cloudCard,
  ].filter(Boolean);

  faq.innerHTML = cards.join('');
}

function renderJsonLd(config) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `Что значит запрос «${config.queryExample}»?`,
        acceptedAnswer: { '@type': 'Answer', text: config.about },
      },
      {
        '@type': 'Question',
        name: 'Что можно искать?',
        acceptedAnswer: { '@type': 'Answer', text: config.queries },
      },
      {
        '@type': 'Question',
        name: 'Как выдаются результаты?',
        acceptedAnswer: { '@type': 'Answer', text: config.flow },
      },
    ],
  };

  const el = document.querySelector('[data-jsonld]');
  if (el) el.textContent = JSON.stringify(jsonLd);
}

function resolveMediaType(mediaType) {
  return mediaType === 'tv' ? 'tv' : 'movie';
}

function buildMovieDeepLink(movie) {
  return `${TELEGRAM_MOVIE_SEARCH_PREFIX}${movie.id}-${resolveMediaType(movie.media_type)}-lnd`;
}

function buildMovieIntentLink(movieId) {
  return `/pages/skachat-film-${movieId}.html`;
}

function resolveMovieLink(movie, config = {}) {
  if (config.linkType === 'intent') {
    return buildMovieIntentLink(movie.id);
  }

  return buildMovieDeepLink(movie);
}

function renderPopularMovies(config = {}) {
  const container = document.querySelector('[data-popular-movies]');
  if (!container) return;

  const source = Array.isArray(config.movies) ? config.movies : [];
  const limit = Number.isFinite(config.limit) ? config.limit : source.length;
  const items = source.slice(0, limit).filter((movie) => movie && movie.id && movie.title);

  if (!items.length) {
    container.innerHTML = `<li>${config.emptyText || 'Список скоро обновится.'}</li>`;
    return;
  }

  const target = config.linkType === 'intent' ? '_self' : '_blank';
  const rel = config.linkType === 'intent' ? '' : ' rel="noopener"';

  container.innerHTML = items
    .map((movie) => `<li><a href="${resolveMovieLink(movie, config)}" target="${target}"${rel}>${movie.title}</a></li>`)
    .join('');
}

function initIntentPage(config) {
  fillMeta(config);
  renderFaq(config);
  renderJsonLd(config);

  const h1 = document.querySelector('[data-h1]');
  if (h1) {
    h1.innerHTML = `${config.h1}<br /><br />Бот для поиска файлов и медиа в Telegram`;
  }
}

function initFilmDownloadPage(config = {}) {
  const title = document.querySelector('[data-popular-movies-title]');
  if (title && config.title) {
    title.textContent = config.title;
  }

  renderPopularMovies(config);
}

if (window.INTENT_PAGE_CONFIG) {
  initIntentPage(window.INTENT_PAGE_CONFIG);
}

if (window.FILM_DOWNLOAD_PAGE_CONFIG) {
  initFilmDownloadPage(window.FILM_DOWNLOAD_PAGE_CONFIG);
}
