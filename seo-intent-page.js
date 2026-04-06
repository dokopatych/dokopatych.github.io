const COMMON_NAV_LINKS = [
  { href: "/", label: "Главная страница" },
  { href: "/pages/music-search-bot", label: "Поиск музыки" },
  { href: "/pages/audiobooks", label: "Аудиокниги" },
  { href: "/pages/audiobook-search-bot", label: "Поиск аудиокниг" },
  { href: "/pages/film-download-bot", label: "Поиск фильмов и сериалов" },
  { href: "/pages/chto-posmotret-vecherom", label: "Что посмотреть вечером" },
  { href: "/pages/neochevidnye-filmy", label: "Неочевидные фильмы" },
  { href: "/pages/filmy-kak", label: "Фильмы как…" },
  { href: "/pages/game-search-bot", label: "Поиск игр и программ" },
  { href: "/pages/file-search-bot", label: "Поиск файлов и медиа" },
]

const TELEGRAM_MOVIE_SEARCH_PREFIX =
  "https://t.me/DokopatychBot?start=searchTr-"

const normalizePagePath =
  window.movieRoutes?.normalizePagePath ||
  function (urlPath) {
    return String(urlPath || "")
      .replace(/\/index\.html$/i, "")
      .replace(/\.html$/i, "")
  }

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function fillMeta(config) {
  document.title = config.title
  const set = (selector, attr, value) => {
    const el = document.querySelector(selector)
    if (el) el.setAttribute(attr, value)
  }

  set('meta[name="description"]', "content", config.description)
  set('meta[property="og:title"]', "content", config.title)
  set('meta[property="og:description"]', "content", config.description)
  set('meta[property="og:url"]', "content", config.url)
  set('link[rel="canonical"]', "href", config.url)
}

function renderListBlock(block) {
  if (!block || !Array.isArray(block.items) || !block.items.length) {
    return ""
  }

  const title = escapeHtml(block.title || "Подборка")
  const items = block.items
    .map((item) => {
      if (typeof item === "string") {
        return `<li>${escapeHtml(item)}</li>`
      }

      if (item && item.href && item.label) {
        return `<li><a href="${item.href}">${escapeHtml(item.label)}</a></li>`
      }

      return ""
    })
    .filter(Boolean)
    .join("")

  if (!items) {
    return ""
  }

  return `<div class="faqCard"><h3>${title}</h3><ul>${items}</ul></div>`
}

function renderFaq(config) {
  const faq = document.querySelector("[data-faq]")
  if (!faq) return
  const navLinks =
    Array.isArray(config.navLinks) && config.navLinks.length
      ? config.navLinks
      : COMMON_NAV_LINKS

  const cloudItems = Array.isArray(config.tagCloudQueries)
    ? config.tagCloudQueries
    : []
  const cloudCard = cloudItems.length
    ? `<div class="faqCard"><h3>${escapeHtml(config.tagCloudTitle || "Облако запросов")}</h3><div class="neon-tag-cloud">${cloudItems
        .map((query) => `<span class="neon-tag">${escapeHtml(query)}</span>`)
        .join("")}</div></div>`
    : ""

  const listCards = Array.isArray(config.listBlocks)
    ? config.listBlocks.map((block) => renderListBlock(block)).filter(Boolean)
    : []

  const cards = [
    `<div class="faqCard"><h2>${config.h2}</h2><p>${config.description}</p></div>`,
    `<div class="faqCard"><h3>Как скачать</h3><p>${config.about}</p></div>`,
    `<div class="faqCard"><h3>Как работает бот</h3><p>${config.flow}</p></div>`,
    ...listCards,
    `<div class="faqCard"><h3>Навигация</h3><ul>${navLinks.map((l) => `<li><a href="${l.href}">${l.label}</a></li>`).join("")}</ul></div>`,
    cloudCard,
  ].filter(Boolean)

  faq.innerHTML = cards.join("")
}

function renderJsonLd(config) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Что значит запрос «${config.queryExample}»?`,
        acceptedAnswer: { "@type": "Answer", text: config.about },
      },
      {
        "@type": "Question",
        name: "Что можно искать?",
        acceptedAnswer: { "@type": "Answer", text: config.queries },
      },
      {
        "@type": "Question",
        name: "Как выдаются результаты?",
        acceptedAnswer: { "@type": "Answer", text: config.flow },
      },
    ],
  }

  const el = document.querySelector("[data-jsonld]")
  if (el) el.textContent = JSON.stringify(jsonLd)
}

function resolveMediaType(mediaType) {
  const normalized = String(mediaType || "").toLowerCase()
  if (["tv", "aud", "game", "music", "book"].includes(normalized)) {
    return normalized
  }

  return "movie"
}

function buildMovieDeepLink(movie) {
  return `${TELEGRAM_MOVIE_SEARCH_PREFIX}${movie.id}-${resolveMediaType(movie.media_type)}-lnd`
}

function buildMovieIntentLink(movie, config = {}) {
  const routeMap = config.movieRoutesById
  if (window.movieRoutes?.buildMovieIntentPath) {
    return window.movieRoutes.buildMovieIntentPath(movie, routeMap)
  }

  return normalizePagePath(`/pages/about-movie/${movie.id}`)
}

function resolveMovieLink(movie, config = {}) {
  if (config.linkType === "intent") {
    return buildMovieIntentLink(movie, config)
  }

  return buildMovieDeepLink(movie)
}

function renderPopularMovies(config = {}) {
  const container = document.querySelector("[data-popular-movies]")
  if (!container) return

  const source = Array.isArray(config.movies) ? config.movies : []
  const limit = Number.isFinite(config.limit) ? config.limit : source.length
  const items = source
    .slice(0, limit)
    .filter((movie) => movie && movie.id && (movie.title || movie.original_title))

  if (!items.length) {
    container.innerHTML = `<li>${config.emptyText || "Список скоро обновится."}</li>`
    return
  }

  const target = config.linkType === "intent" ? "_self" : "_blank"
  const rel = config.linkType === "intent" ? "" : ' rel="noopener"'

  container.innerHTML = items
    .map(
      (movie) =>
        `<li><a href="${resolveMovieLink(movie, config)}" target="${target}"${rel}>${movie.title || movie.original_title}</a></li>`,
    )
    .join("")
}

function initIntentPage(config) {
  fillMeta(config)
  renderFaq(config)
  renderJsonLd(config)

  const h1 = document.querySelector("[data-h1]")
  if (h1) {
    h1.innerHTML = `${config.h1}<br /><br />Бот для поиска файлов и медиа в Telegram`
  }
}

function initFilmDownloadPage(config = {}) {
  const rawMovies = Array.isArray(window.popularMovies) ? window.popularMovies : []
  if (window.movieRoutes?.createMovieRouteMap && rawMovies.length) {
    config.movieRoutesById = window.movieRoutes.createMovieRouteMap(rawMovies)
  }

  const title = document.querySelector("[data-popular-movies-title]")
  if (title && config.title) {
    title.textContent = config.title
  }

  renderPopularMovies(config)
}

if (window.INTENT_PAGE_CONFIG) {
  initIntentPage(window.INTENT_PAGE_CONFIG)
}

if (window.FILM_DOWNLOAD_PAGE_CONFIG) {
  initFilmDownloadPage(window.FILM_DOWNLOAD_PAGE_CONFIG)
}
