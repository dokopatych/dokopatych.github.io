const fs = require("fs")
const path = require("path")
const vm = require("vm")
const { popularMovies } = require("../movies.js")
const { popularAudiobooks = [] } = require("../audiobooks.js")
const { popularGames = [] } = require("../games.js")
const { popularMusic = [] } = require("../music.js")
const { popularBooks = [] } = require("../books.js")
const { movieQueries, tvQueries } = require("../keys.js")
const {
  createMovieRouteMap,
  normalizePagePath,
  slugifyMovieTitle,
} = require("../movie-routes.js")

// Point ROOT to the project root (one level up from this scripts/ directory)
const ROOT = path.resolve(__dirname, "..")
const BASE_URL = "https://dokopatych.vercel.app"
const TODAY = new Date().toISOString().slice(0, 10)
const SITEMAP_PATH = path.join(ROOT, "sitemap.xml")
const LINKS_LIST_PATH = path.join(ROOT, "all-links.txt")
const PAGES_DIR = path.join(ROOT, "pages")
const ABOUT_MOVIE_DIR = path.join(PAGES_DIR, "about-movie")
const ROOT_ASSETS = {
  analytics: "/analytics.js",
  styles: "/styles.css",
  avatar: "/images/round-sm.webp",
  movieRoutes: "/movie-routes.js",
  seoIntentPage: "/seo-intent-page.js",
  movies: "/movies.js",
}

const SECTION_CONFIG = {
  movies: {
    dir: "about-movie",
    label: "Фильмы и сериалы",
    href: "/pages/about-movie",
  },
  audiobooks: {
    dir: "audiobooks",
    label: "Аудиокниги",
    href: "/pages/audiobooks",
    telegramType: "aud",
  },
  games: {
    dir: "games",
    label: "Игры",
    href: "/pages/games",
    telegramType: "game",
  },
  music: {
    dir: "music",
    label: "Музыкальные альбомы",
    href: "/pages/music",
    telegramType: "music",
  },
  books: {
    dir: "books",
    label: "Книги",
    href: "/pages/books",
    telegramType: "book",
  },
}

const NON_INDEXED_PAGE_PATTERNS = [/^pages\/skachat-film-.*\.html$/]
const LINK_SECTIONS = [
  { key: "root", prefix: "/" },
  { key: "about-movie", prefix: "/pages/about-movie/" },
  { key: "audiobooks", prefix: "/pages/audiobooks/" },
  { key: "pages", prefix: "/pages/" },
]

const SEO_BASE_PAGES = [
  { loc: `${BASE_URL}/`, changefreq: "daily", priority: "1.0" },
]
const SEO_BASE_PAGES_BY_LOC = new Map(
  SEO_BASE_PAGES.map((page) => [page.loc, page]),
)

const MEDIA_COPY = {
  movie: {
    nounAccusative: "фильм",
    nounGenitive: "фильма",
    nounPlural: "фильмы",
    headingPlural: "фильмы",
    applicationName: "Докопатыч | Поиск фильмов",
    telegramType: "movie",
  },
  tv: {
    nounAccusative: "сериал",
    nounGenitive: "сериала",
    nounPlural: "сериалы",
    headingPlural: "сериалы",
    applicationName: "Докопатыч | Поиск сериалов",
    telegramType: "tv",
  },
  aud: {
    nounAccusative: "аудиокнигу",
    nounGenitive: "аудиокниги",
    nounPlural: "аудиокниги",
    headingPlural: "аудиокниги",
    applicationName: "Докопатыч | Поиск аудиокниг",
    telegramType: "aud",
  },
  game: {
    nounAccusative: "игру",
    nounGenitive: "игры",
    nounPlural: "игры",
    headingPlural: "игры",
    applicationName: "Докопатыч | Поиск игр",
    telegramType: "game",
  },
  music: {
    nounAccusative: "альбом",
    nounGenitive: "альбома",
    nounPlural: "альбомы",
    headingPlural: "альбомы",
    applicationName: "Докопатыч | Поиск музыки",
    telegramType: "music",
  },
  book: {
    nounAccusative: "книгу",
    nounGenitive: "книги",
    nounPlural: "книги",
    headingPlural: "книги",
    applicationName: "Докопатыч | Поиск книг",
    telegramType: "book",
  },
}

const QUERY_STOP_WORDS = new Set([
  "скачать",
  "торрент",
  "бесплатно",
  "хорошем",
  "качестве",
  "через",
  "фильм",
  "фильмы",
  "сериал",
  "сериалы",
  "русские",
  "российские",
  "новые",
  "лучшие",
  "сезон",
  "серии",
  "год",
  "года",
])

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function collectionPagePath(item, collection, routesById) {
  const section = SECTION_CONFIG[collection]
  const routePath = routesById?.get(item.id)?.urlPath
  if (routePath) {
    return routePath
  }

  return `/pages/${section.dir}/${item.id}`
}

function collectionPageFilePath(item, collection, routesById) {
  return path.join(ROOT, collectionPagePath(item, collection, routesById), "index.html")
}

function toAbsoluteUrl(relativePath) {
  return `${BASE_URL}${normalizePagePath(relativePath)}`
}

function rootAsset(asset) {
  return ROOT_ASSETS[asset]
}

function resolveMediaType(mediaType) {
  const normalized = String(mediaType || "").toLowerCase()
  if (normalized in MEDIA_COPY) {
    return normalized
  }

  return normalized === "tv" ? "tv" : "movie"
}

function resolveMediaCopy(mediaType) {
  return MEDIA_COPY[resolveMediaType(mediaType)]
}

function hasHtmlPagesInDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return false
  }

  return fs.readdirSync(dirPath, { withFileTypes: true }).some((entry) => {
    const entryPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      return hasHtmlPagesInDir(entryPath)
    }

    return entry.isFile() && entry.name.endsWith(".html")
  })
}

function hrefToOutputFilePath(href) {
  const normalizedHref = normalizePagePath(href)
  const relative = normalizedHref.replace(/^\//, "")
  if (relative.toLowerCase().endsWith(".html")) {
    return path.join(ROOT, relative)
  }

  return path.join(ROOT, relative, "index.html")
}

function hasGeneratedPage(href) {
  return fs.existsSync(hrefToOutputFilePath(href))
}

function resolveCollectionNavLinks() {
  const links = [{ href: "/", label: "Главная страница" }]
  const order = ["audiobooks", "games", "music", "books"]

  order.forEach((key) => {
    const section = SECTION_CONFIG[key]
    if (!section) return
    const sectionDir = path.join(PAGES_DIR, section.dir)
    if (hasHtmlPagesInDir(sectionDir)) {
      links.push({ href: section.href, label: section.label })
    }
  })

  const extraLinks = [
    { href: "/pages/all-movies.html", label: "Все фильмы и сериалы" },
    { href: "/pages/music-search-bot.html", label: "Поиск музыки" },
    { href: "/pages/audiobook-search-bot.html", label: "Поиск аудиокниг" },
    { href: "/pages/film-download-bot.html", label: "Поиск фильмов и сериалов" },
    { href: "/pages/chto-posmotret-vecherom.html", label: "Что посмотреть вечером" },
    { href: "/pages/neochevidnye-filmy.html", label: "Неочевидные фильмы" },
    { href: "/pages/filmy-kak.html", label: "Фильмы как…" },
    { href: "/pages/game-search-bot.html", label: "Поиск игр и программ" },
    { href: "/pages/file-search-bot.html", label: "Поиск файлов и медиа" },
  ].filter((item) => hasGeneratedPage(item.href))

  links.push(...extraLinks)

  return links
}

function resolveTelegramType(movie, options = {}) {
  if (options.telegramType) {
    return options.telegramType
  }

  const media = resolveMediaCopy(movie.media_type)
  return media.telegramType
}

function movieDeepLink(movie, options = {}) {
  return `https://t.me/DokopatychBot?start=searchTr-${movie.id}-${resolveTelegramType(movie, options)}-lnd`
}

function movieDesktopDeepLink(movie, options = {}) {
  const webLink = movieDeepLink(movie, options)
  const payload = webLink.split("?start=")[1] || ""
  return `tg://resolve?domain=DokopatychBot${payload ? `&start=${payload}` : ""}`
}

function tokenize(value) {
  return String(value)
    .toLowerCase()
    .split(/[^a-zа-я0-9]+/i)
    .filter((token) => token.length >= 3 && !QUERY_STOP_WORDS.has(token))
}

function uniqueNonEmpty(values) {
  return [
    ...new Set(
      values
        .map((value) => String(value || "").replace(/\s+/g, " ").trim())
        .filter(Boolean),
    ),
  ]
}

function buildFallbackTagCloudQueries(movie, limit = 20) {
  const media = resolveMediaCopy(movie.media_type)
  const title = movie.title
  const releaseYear = String(movie.release_date || "").slice(0, 4)
  const base = [
    `скачать ${media.nounAccusative} ${title}`,
    `${title} торрент`,
    `${title} скачать через telegram`,
    `${title} в хорошем качестве`,
    `${title} смотреть онлайн`,
    `${title} ${media.nounGenitive} скачать`,
    `${title} ${media.nounPlural}`,
    releaseYear ? `${title} ${releaseYear}` : "",
  ]

  return uniqueNonEmpty(base).slice(0, limit)
}

function pickTagCloudQueries(movie, limit = 20) {
  const source =
    resolveMediaType(movie.media_type) === "tv" ? tvQueries : movieQueries
  const titleTokens = tokenize(movie.title)

  if (!titleTokens.length) {
    return buildFallbackTagCloudQueries(movie, limit)
  }

  const scored = source
    .map((query) => {
      const queryTokens = new Set(tokenize(query))
      const score = titleTokens.reduce(
        (acc, token) => acc + (queryTokens.has(token) ? 1 : 0),
        0,
      )
      return { query, score }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.query.length - b.query.length)
    .map((item) => item.query)

  if (scored.length >= limit) {
    return uniqueNonEmpty(scored).slice(0, limit)
  }

  const fallback = buildFallbackTagCloudQueries(movie, limit)
  return uniqueNonEmpty([...scored, ...fallback]).slice(0, limit)
}

// ---------- Prerender helpers ----------
// These mirror the runtime logic in seo-intent-page.js / section-index.js /
// all-movies.js so the same content is baked into the static HTML at build
// time. AI crawlers and search bots that do not execute JavaScript get the
// full text, internal links and JSON-LD straight from the markup.

const SCHEMA_TYPE_BY_MEDIA = {
  movie: "Movie",
  tv: "TVSeries",
  aud: "Audiobook",
  game: "VideoGame",
  music: "MusicAlbum",
  book: "Book",
}

const TELEGRAM_CARD_LINK_PREFIX = "https://t.me/DokopatychBot?start=searchTr-"

function toJsonLdScript(json) {
  const serialized = JSON.stringify(json).replace(/</g, "\\u003c")
  return `<script type="application/ld+json" data-jsonld>${serialized}</script>`
}

function renderTelegramButtonsHtml(config) {
  if (!config.webLink || !config.desktopLink) {
    return ""
  }

  return `<div class="btns-container"><a href="${escapeHtml(config.webLink)}" class="start-btn" target="_blank" rel="noopener">WEB</a><a href="${escapeHtml(config.desktopLink)}" class="start-btn">DESKTOP</a></div>`
}

function renderListBlockHtml(block) {
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
        return `<li><a href="${escapeHtml(encodeURI(item.href))}">${escapeHtml(item.label)}</a></li>`
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

function renderNavListHtml(navLinks) {
  return `<ul>${navLinks
    .map(
      (link) =>
        `<li><a href="${escapeHtml(encodeURI(link.href))}">${escapeHtml(link.label)}</a></li>`,
    )
    .join("")}</ul>`
}

function renderTagCloudCardHtml(config) {
  const cloudItems = Array.isArray(config.tagCloudQueries)
    ? config.tagCloudQueries
    : []
  if (!cloudItems.length) {
    return ""
  }

  const title = escapeHtml(config.tagCloudTitle || "Облако запросов")
  return `<div class="faqCard"><h3>${title}</h3><div class="neon-tag-cloud">${cloudItems
    .map((query) => `<span class="neon-tag">${escapeHtml(query)}</span>`)
    .join("")}</div></div>`
}

function renderFaqCardsHtml(config) {
  const navLinks =
    Array.isArray(config.navLinks) && config.navLinks.length
      ? config.navLinks
      : resolveCollectionNavLinks()

  const cards = [
    `<div class="faqCard"><h2>${config.h2}</h2><p>${config.description}</p></div>`,
    `<div class="faqCard"><h3>Как открыть в Telegram и скачать</h3><p>${config.about}</p>${renderTelegramButtonsHtml(config)}</div>`,
    ...(Array.isArray(config.listBlocks)
      ? config.listBlocks.map(renderListBlockHtml).filter(Boolean)
      : []),
    `<div class="faqCard"><h3>Навигация</h3>${renderNavListHtml(navLinks)}</div>`,
    renderTagCloudCardHtml(config),
  ].filter(Boolean)

  return cards.join("")
}

function renderPopularListHtml(items, { linkType = "deep", limit = 10 } = {}) {
  return items
    .filter((item) => item && (item.title || item.original_title))
    .slice(0, limit)
    .map((item) => {
      const label = escapeHtml(item.title || item.original_title)
      if (linkType === "intent") {
        const href = normalizePagePath(`/pages/about-movie/${item.id}`)
        return `<li><a href="${escapeHtml(encodeURI(href))}">${label}</a></li>`
      }

      return `<li><a href="${escapeHtml(movieDeepLink(item))}" target="_blank" rel="noopener">${label}</a></li>`
    })
    .join("")
}

function buildBreadcrumbGraph(breadcrumbs) {
  if (!Array.isArray(breadcrumbs) || breadcrumbs.length < 2) {
    return null
  }

  return {
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs
      .filter((item) => item && item.name && item.url)
      .map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
  }
}

function buildIntentJsonLd(config, movie = null) {
  const graph = []

  graph.push({
    "@type": "WebPage",
    "@id": config.url,
    url: config.url,
    name: config.title,
    description: config.description,
    inLanguage: "ru",
  })

  const breadcrumb = buildBreadcrumbGraph(config.breadcrumbs)
  if (breadcrumb) {
    graph.push(breadcrumb)
  }

  const faqItems = Array.isArray(config.faq) ? config.faq : []
  if (faqItems.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: faqItems
        .filter((item) => item && item.q && item.a)
        .map((item) => ({
          "@type": "Question",
          name: String(item.q),
          acceptedAnswer: { "@type": "Answer", text: String(item.a) },
        })),
    })
  }

  const schemaType = movie
    ? SCHEMA_TYPE_BY_MEDIA[resolveMediaType(movie.media_type)]
    : null
  if (schemaType) {
    const mediaNode = {
      "@type": schemaType,
      name: movie.title || movie.original_title,
      description: config.description,
      url: config.url,
      inLanguage: "ru",
    }

    if (
      movie.original_title &&
      movie.original_title !== movie.title &&
      /^[\x00-\x7F]+$/.test(movie.original_title)
    ) {
      mediaNode.alternateName = movie.original_title
    }

    if (movie.release_date) {
      mediaNode.datePublished = movie.release_date
    }

    graph.push(mediaNode)
  }

  return { "@context": "https://schema.org", "@graph": graph }
}

function buildSectionIndexJsonLd(config) {
  const graph = []

  graph.push({
    "@type": "WebPage",
    "@id": config.canonical,
    url: config.canonical,
    name: config.title,
    description: config.description,
    inLanguage: "ru",
  })

  graph.push({
    "@type": "BreadcrumbList",
    itemListElement: [
      { name: "Докопатыч", url: toAbsoluteUrl("/") },
      { name: config.h1 || config.title, url: config.canonical },
    ].map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  })

  const items = Array.isArray(config.items) ? config.items : []
  if (items.length) {
    graph.push({
      "@type": "ItemList",
      itemListElement: items
        .filter((item) => item && item.href && item.label)
        .map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: toAbsoluteUrl(item.href),
          name: item.label,
        })),
    })
  }

  return { "@context": "https://schema.org", "@graph": graph }
}

function buildIntentConfig(movie, tagCloudQueries, movieRoutesById, options = {}) {
  const quotedTitle = `«${movie.title}»`
  const media = resolveMediaCopy(movie.media_type)
  const queryHighlights = tagCloudQueries.slice(0, 6)
  const link = movieDeepLink(movie, options)
  const desktopLink = movieDesktopDeepLink(movie, options)
  const mediaType = resolveMediaType(movie.media_type)
  const h2LabelByType = {
    movie: "Фильм",
    tv: "Сериал",
    aud: "Аудиокнига",
    game: "Игра",
    music: "Альбом",
    book: "Книга",
  }
  const h2Label = h2LabelByType[mediaType] || media.nounAccusative
  const h2 = `${h2Label} ${quotedTitle}`
  const overview = String(movie.overview || "").replace(/\s+/g, " ").trim()
  const fallbackDescriptionByType = {
    movie: `Короткая страница про фильм ${quotedTitle}: здесь можно быстро перейти к поиску в Telegram и открыть варианты по названию.`,
    tv: `Короткая страница про сериал ${quotedTitle}: переход к поиску в Telegram уже подготовлен — удобно, если ищете по названию или сезону.`,
    aud: `Страница про аудиокнигу ${quotedTitle}: быстрый переход к поиску в Telegram, чтобы найти издание, чтеца или серию.`,
    music: `Страница про альбом ${quotedTitle}: быстрый переход к поиску в Telegram, чтобы найти треки и варианты по исполнителю.`,
    game: `Страница про игру ${quotedTitle}: быстрый переход к поиску в Telegram — можно искать по названию и платформе.`,
    book: `Страница про книгу ${quotedTitle}: быстрый переход к поиску в Telegram, чтобы найти нужное издание по названию и автору.`,
  }
  const description =
    overview.length >= 80
      ? overview
      : fallbackDescriptionByType[mediaType] ||
        `Где найти ${media.nounAccusative} ${quotedTitle}: откройте Telegram‑бота Докопатыч — запрос уже подготовлен, остаётся выбрать вариант.`
  const section =
    SECTION_CONFIG[options.collection || "movies"] || SECTION_CONFIG.movies
  const canonicalUrl = toAbsoluteUrl(
    collectionPagePath(movie, options.collection || "movies", movieRoutesById),
  )
  const breadcrumbs = [
    { name: "Докопатыч", url: toAbsoluteUrl("/") },
    { name: section.label, url: toAbsoluteUrl(section.href) },
    { name: movie.title, url: canonicalUrl },
  ]
  const aboutText = `Откройте ${media.nounAccusative} ${quotedTitle} через Telegram‑бота — он стартует сразу с нужным запросом.`
  const flowText =
    "Нажмите кнопку — откроется Telegram‑бот, и запрос уже будет заполнен. Это экономит время и помогает быстрее найти нужное."

  return {
    title: `Скачать ${media.nounAccusative} ${quotedTitle} — через Telegram-бота | Докопатыч`,
    url: canonicalUrl,
    h1: `Скачать ${media.nounAccusative} ${quotedTitle}`,
    h2,
    description,
    queryExample: `скачать ${media.nounAccusative} ${movie.title}`,
    about: `<a href="${link}">Открыть ${media.nounAccusative} ${quotedTitle}</a> можно через Telegram‑бота: он запускается сразу с нужным запросом.`,
    aboutText,
    webLink: link,
    desktopLink,
    queries: queryHighlights.length
      ? `Часто ищут так: ${queryHighlights.join(", ")}.`
      : `Часто ищут так: скачать ${media.nounAccusative} ${movie.title}, ${movie.title} ${media.nounAccusative} скачать, ${movie.title} Telegram.`,
    flow: flowText,
    flowText,
    popularTitle: `Другие ${media.headingPlural}`,
    applicationName: media.applicationName,
    tagCloudTitle: "Популярные поисковые запросы по теме",
    tagCloudQueries,
    breadcrumbs,
    faq: [
      {
        q: `Как открыть ${media.nounAccusative} ${quotedTitle}?`,
        a: aboutText,
      },
      {
        q: "Нужно ли что-то вводить вручную?",
        a: "При переходе со страницы файла – нет. Запрос подставляется автоматически — обычно достаточно открыть бота и выбрать результат. Далее можно отправлять ему что угодно, он поищет.",
      },
      {
        q: "Какие запросы чаще всего используют?",
        a: queryHighlights.length
          ? `Например: ${queryHighlights.join(", ")}.`
          : `Например: скачать ${media.nounAccusative} ${movie.title}.`,
      },
    ],
    navLinks: resolveCollectionNavLinks(),
  }
}

function mapMovieForIntentLink(movie, movieRoutesById) {
  const route = movieRoutesById.get(movie.id)

  if (!route) {
    return movie
  }

  return { ...movie, id: route.slug }
}

function buildMoviePageHtml(movie, movieRoutesById, options = {}) {
  const collection = options.collection || "movies"
  const source = flattenPopularItems(options.items || popularMovies)
  const config = buildIntentConfig(
    movie,
    pickTagCloudQueries(movie),
    movieRoutesById,
    options,
  )
  const relatedItems = source
    .filter((item) => item.id !== movie.id)
    .map((item) =>
      options.linkType === "intent"
        ? mapMovieForIntentLink(item, movieRoutesById)
        : item,
    )
  const relatedItemsForIntent = JSON.stringify(relatedItems)
  const popularListHtml = renderPopularListHtml(relatedItems, {
    linkType: options.linkType || "deep",
    limit: 10,
  })
  const configJson = JSON.stringify(config)

  return `<!doctype html>
<html lang="ru">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="${rootAsset("analytics")}"></script>
    <title>${escapeHtml(config.title)}</title>
    <meta name="description" content="${escapeHtml(config.description)}" />
    <meta name="application-name" content="${escapeHtml(config.applicationName)}" />
    <meta property="og:title" content="${escapeHtml(config.title)}" />
    <meta property="og:site_name" content="Докопатыч" />
    <meta property="og:description" content="${escapeHtml(config.description)}" />
    <meta property="og:image" content="https://dokopatych.vercel.app/images/square.webp" />
    <meta property="og:image:width" content="1024" />
    <meta property="og:image:height" content="1024" />
    <meta property="og:locale" content="ru_RU" />
    <meta property="og:url" content="${escapeHtml(config.url)}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="canonical" href="${escapeHtml(config.url)}">
    <link rel="icon" href="https://dokopatych.vercel.app/images/round-sm.ico" type="image/x-icon">
    <link rel="shortcut icon" href="https://dokopatych.vercel.app/images/round-sm.ico" />
    <link rel="stylesheet" href="${rootAsset("styles")}" />
    ${toJsonLdScript(buildIntentJsonLd(config, movie))}

</head>
<body>
    <div class="backGround"></div>
    <div class='column'>
        <div class="botCard">
            <img src="${rootAsset("avatar")}" alt="Аватар" class="avatar" />
            <span class="name">Докопатыч</span>
            <span class="username">@DokopatychBot</span>
            <h1 class="description" data-h1>${escapeHtml(config.h1)}</h1>
            <div class="btns-container">
                <a href="${movieDeepLink(movie, options)}" class="start-btn" target="_blank" rel="noopener">WEB</a>
                <a href="${movieDesktopDeepLink(movie, options)}" class="start-btn">DESKTOP</a>
            </div>
        </div>
        <div class="faq" data-faq>${renderFaqCardsHtml(config)}</div>
        <div class="faq">
            <div class="faqCard"><h3>${escapeHtml(config.popularTitle)}</h3><ul data-popular-movies>${popularListHtml}</ul></div>
        </div>
    </div>
    <script src="${rootAsset("movies")}"></script>
    <script>
        window.INTENT_PAGE_CONFIG = ${configJson};
        window.FILM_DOWNLOAD_PAGE_CONFIG = {
            movies: ${relatedItemsForIntent},
            limit: 10,
            linkType: ${JSON.stringify(options.linkType || "deep")},
            emptyText: 'Список скоро обновится.',
        };
        (function() {
          var isMobile = /iphone|ipad|ipod|android|blackberry|opera mini|iemobile|mobile/i.test((navigator.userAgent||'').toLowerCase()) || (window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
          if (!isMobile) return;
          var btns = document.querySelector('.btns-container');
          if (!btns) return;
          btns.innerHTML = '';
          var a = document.createElement('a');
          a.className = 'start-btn';
          a.href = ${JSON.stringify(movieDeepLink(movie, options))};
          a.target = '_blank';
          a.rel = 'noopener';
          a.textContent = 'ОТКРЫТЬ В TELEGRAM';
          btns.appendChild(a);
        })();
    </script>
    <script src="${rootAsset("movieRoutes")}"></script>
    <script src="${rootAsset("seoIntentPage")}"></script>
</body>
</html>
`
}

function buildSectionIndexConfig(collection, items, routesById) {
  const section = SECTION_CONFIG[collection]
  if (!section) {
    return null
  }

  const canonical = toAbsoluteUrl(section.href)
  const collectionLabelLower = section.label.toLowerCase()
  const h1 = `${section.label} в Telegram-боте`
  const introByCollection = {
    movies:
      "Подборка фильмов и сериалов, которые чаще всего ищут. У каждой позиции есть отдельная страница с быстрым переходом к поиску в Telegram.",
    audiobooks:
      "Каталог аудиокниг: выбирайте название — дальше можно быстро перейти к поиску в Telegram (удобно для серии, автора и разных озвучек).",
    music:
      "Каталог музыкальных альбомов: откройте нужный релиз и переходите к поиску в Telegram по исполнителю и названию.",
    games:
      "Каталог игр: выберите тайтл и перейдите к поиску в Telegram — удобно, если ищете по названию и платформе.",
    books:
      "Каталог книг: выберите произведение и перейдите к поиску в Telegram по названию и автору.",
  }
  const sectionDescription =
    introByCollection[collection] ||
    `Здесь собраны популярные ${collectionLabelLower}. Выберите нужное — и перейдите к поиску в боте.`

  return {
    title: `${section.label} — каталог | Докопатыч`,
    description: `Каталог: ${collectionLabelLower}. Выберите позицию из списка — откроется страница с быстрым переходом в Telegram‑бота Докопатыч.`,
    canonical,
    h1,
    sectionDescription,
    listTitle: `Популярные ${collectionLabelLower}`,
    emptyText: "Список скоро обновится.",
    items: items.map((item) => ({
      href: collectionPagePath(item, collection, routesById),
      label: item.release_date
        ? `${item.title} (${String(item.release_date).slice(0, 4)})`
        : item.title,
    })),
    navLinks: resolveCollectionNavLinks(),
  }
}

function buildSectionIndexPageHtml(collection, items, routesById) {
  const config = buildSectionIndexConfig(collection, items, routesById)
  if (!config) {
    return ""
  }

  const listHtml = (config.items || [])
    .map(
      (item) =>
        `<li><a href="${escapeHtml(encodeURI(item.href))}">${escapeHtml(item.label)}</a></li>`,
    )
    .join("")
  const navHtml = renderNavListHtml(config.navLinks)

  return `<!doctype html>
<html lang="ru">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="${rootAsset("analytics")}"></script>
    <title>${escapeHtml(config.title)}</title>
    <meta name="description" content="${escapeHtml(config.description)}" />
    <meta property="og:title" content="${escapeHtml(config.title)}" />
    <meta property="og:site_name" content="Докопатыч" />
    <meta property="og:description" content="${escapeHtml(config.description)}" />
    <meta property="og:image" content="https://dokopatych.vercel.app/images/square.webp" />
    <meta property="og:image:width" content="1024" />
    <meta property="og:image:height" content="1024" />
    <meta property="og:locale" content="ru_RU" />
    <meta property="og:url" content="${escapeHtml(config.canonical)}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="canonical" href="${escapeHtml(config.canonical)}">
    <link rel="icon" href="https://dokopatych.vercel.app/images/round-sm.ico" type="image/x-icon">
    <link rel="shortcut icon" href="https://dokopatych.vercel.app/images/round-sm.ico" />
    <link rel="stylesheet" href="${rootAsset("styles")}" />
    ${toJsonLdScript(buildSectionIndexJsonLd(config))}
</head>
<body>
    <div class="backGround"></div>
    <div class='column'>
        <div class="botCard">
            <img src="${rootAsset("avatar")}" alt="Аватар" class="avatar" />
            <span class="name">Докопатыч</span>
            <span class="username">@DokopatychBot</span>
            <h1 class="description" data-section-h1>${escapeHtml(config.h1)}</h1>
        </div>
        <div class="faq">
            <div class="faqCard">
                <p data-section-description>${escapeHtml(config.sectionDescription)}</p>
            </div>
            <div class="faqCard">
                <h3>${escapeHtml(config.listTitle || "Популярное")}</h3>
                <ul data-section-list>${listHtml}</ul>
            </div>
            <div class="faqCard">
                <h3>Навигация</h3>
                <ul data-section-nav>${navHtml}</ul>
            </div>
        </div>
    </div>
    <script>
      window.SECTION_INDEX_CONFIG = ${JSON.stringify({
        title: config.title,
        description: config.description,
        canonical: config.canonical,
        h1: config.h1,
        sectionDescription: config.sectionDescription,
        listTitle: config.listTitle,
        emptyText: config.emptyText,
        items: config.items,
        navLinks: config.navLinks,
      })};
    </script>
    <script src="/pages/section-index.js"></script>
</body>
</html>
`
}

function normalizePopularItem(item, fallbackMediaType) {
  const mediaType = item.media_type || fallbackMediaType || "movie"
  const title = item.title || item.original_title
  return {
    ...item,
    title,
    media_type: mediaType,
  }
}

function flattenPopularItems(source, fallbackMediaType) {
  return source
    .flat(Infinity)
    .filter((item) => item && typeof item === "object" && item.id)
    .map((item) => normalizePopularItem(item, fallbackMediaType))
    .filter((item) => item.title)
}

function createCollectionRouteMap(items, collection) {
  if (collection === "movies") {
    return createMovieRouteMap(items)
  }

  const section = SECTION_CONFIG[collection]
  const slugCounts = new Map()

  return new Map(
    items.map((item) => {
      const baseSlug = slugifyMovieTitle(item.original_title || item.title)
      const count = slugCounts.get(baseSlug) || 0
      slugCounts.set(baseSlug, count + 1)
      const slug = count ? `${baseSlug}-${count + 1}` : baseSlug

      return [item.id, { slug, urlPath: `/pages/${section.dir}/${slug}` }]
    }),
  )
}

function writeCollectionPages() {
  const collections = [
    {
      key: "movies",
      items: flattenPopularItems(popularMovies, "movie"),
      outputDir: ABOUT_MOVIE_DIR,
      options: { collection: "movies", linkType: "intent" },
    },
    {
      key: "audiobooks",
      items: flattenPopularItems(popularAudiobooks, "aud"),
      outputDir: path.join(PAGES_DIR, SECTION_CONFIG.audiobooks.dir),
      options: { collection: "audiobooks", telegramType: "aud", linkType: "deep" },
    },
    {
      key: "games",
      items: flattenPopularItems(popularGames, "game"),
      outputDir: path.join(PAGES_DIR, SECTION_CONFIG.games.dir),
      options: { collection: "games", telegramType: "game", linkType: "deep" },
    },
    {
      key: "music",
      items: flattenPopularItems(popularMusic, "music"),
      outputDir: path.join(PAGES_DIR, SECTION_CONFIG.music.dir),
      options: { collection: "music", telegramType: "music", linkType: "deep" },
    },
    {
      key: "books",
      items: flattenPopularItems(popularBooks, "book"),
      outputDir: path.join(PAGES_DIR, SECTION_CONFIG.books.dir),
      options: { collection: "books", telegramType: "book", linkType: "deep" },
    },
  ]

  collections.forEach((collection) => {
    fs.rmSync(collection.outputDir, { recursive: true, force: true })
    if (!collection.items.length) {
      return
    }

    const routesById = createCollectionRouteMap(collection.items, collection.key)
    fs.mkdirSync(collection.outputDir, { recursive: true })
    fs.writeFileSync(
      path.join(collection.outputDir, "index.html"),
      buildSectionIndexPageHtml(collection.key, collection.items, routesById),
    )

    collection.items.forEach((item) => {
      const filePath = collectionPageFilePath(item, collection.key, routesById)
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
      fs.writeFileSync(
        filePath,
        buildMoviePageHtml(item, routesById, {
          ...collection.options,
          items: collection.items,
        }),
      )
    })
  })
}

// ---------- Prerender of hand-written pages ----------
// Hand-written pages keep their runtime configs, but the rendered markup and
// JSON-LD are refreshed into the static HTML on every build. Content is
// replaced in place, so repeated builds stay up to date.

function extractObjectLiteral(source, marker) {
  const markerIndex = source.indexOf(marker)
  if (markerIndex === -1) return null
  const start = source.indexOf("{", markerIndex)
  if (start === -1) return null

  let depth = 0
  let inString = false
  let quote = ""
  let escaped = false

  for (let i = start; i < source.length; i += 1) {
    const char = source[i]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === "\\") {
        escaped = true
      } else if (char === quote) {
        inString = false
      }
      continue
    }

    if (char === "'" || char === '"' || char === "`") {
      inString = true
      quote = char
      continue
    }

    if (char === "{") {
      depth += 1
    }

    if (char === "}") {
      depth -= 1
      if (depth === 0) {
        return source.slice(start, i + 1)
      }
    }
  }

  return null
}

function parseIntentsConfig(html) {
  const objectLiteral = extractObjectLiteral(html, "window.INTENT_PAGE_CONFIG")
  if (!objectLiteral) return null

  const sandbox = { window: {} }
  try {
    vm.createContext(sandbox)
    vm.runInContext(`window.INTENT_PAGE_CONFIG = (${objectLiteral})`, sandbox, {
      timeout: 500,
    })
  } catch (error) {
    console.warn(`  ! INTENT_PAGE_CONFIG parse failed: ${error.message}`)
    return null
  }

  return sandbox.window.INTENT_PAGE_CONFIG
}

function replaceElementInnerContent(source, startTag, innerContent, tagName) {
  const startIndex = source.indexOf(startTag)
  if (startIndex === -1) return source
  const contentStart = startIndex + startTag.length

  const openTag = `<${tagName}`
  const closeTag = `</${tagName}>`
  let depth = 1
  let cursor = contentStart

  while (cursor < source.length) {
    const nextOpen = source.indexOf(openTag, cursor)
    const nextClose = source.indexOf(closeTag, cursor)

    if (nextClose === -1) return source

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1
      cursor = nextOpen + openTag.length
      continue
    }

    depth -= 1
    cursor = nextClose + closeTag.length
    if (depth === 0) {
      const closeStart = nextClose
      return (
        source.slice(0, contentStart) +
        innerContent +
        source.slice(closeStart)
      )
    }
  }

  return source
}

function replaceJsonLdScript(source, json) {
  const pattern = /(<script type="application\/ld\+json" data-jsonld>)[\s\S]*?(<\/script>)/
  if (!pattern.test(source)) return source
  const serialized = JSON.stringify(json).replace(/</g, "\\u003c")
  return source.replace(pattern, `$1${serialized}$2`)
}

function prerenderIntentPageHtml(html) {
  const config = parseIntentsConfig(html)
  if (!config || !config.h2 || !config.description) {
    return { html, changed: false }
  }

  let nextHtml = html
  let changed = false

  // JSON-LD first: filling the FAQ below adds card headings that would
  // otherwise trip static-content heuristics.
  if (/<script type="application\/ld\+json" data-jsonld><\/script>/.test(nextHtml)) {
    // Keep a single FAQPage per page: some pages ship their own static schema.
    const configForSchema = html.includes('"FAQPage"')
      ? { ...config, faq: [] }
      : config
    nextHtml = replaceJsonLdScript(nextHtml, buildIntentJsonLd(configForSchema))
    changed = true
  }

  if (nextHtml.includes('<div class="faq" data-faq>')) {
    nextHtml = replaceElementInnerContent(
      nextHtml,
      '<div class="faq" data-faq>',
      renderFaqCardsHtml(config),
      "div",
    )
    changed = true
  }

  return { html: nextHtml, changed }
}

function prerenderIntentPages() {
  const entries = fs
    .readdirSync(PAGES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))

  let count = 0
  entries.forEach((entry) => {
    const filePath = path.join(PAGES_DIR, entry.name)
    const html = fs.readFileSync(filePath, "utf8")
    if (!html.includes("window.INTENT_PAGE_CONFIG")) return

    const { html: nextHtml, changed } = prerenderIntentPageHtml(html)
    if (changed) {
      fs.writeFileSync(filePath, nextHtml)
      count += 1
    }
  })

  if (count) {
    console.log(`Prerendered content into ${count} intent pages.`)
  }
}

function truncateOverview(text, limit = 200) {
  const clean = String(text || "").replace(/\s+/g, " ").trim()
  if (clean.length <= limit) {
    return clean
  }

  const cut = clean.slice(0, limit)
  const spaceIndex = cut.lastIndexOf(" ")
  return `${cut.slice(0, spaceIndex > 0 ? spaceIndex : limit)}…`
}

function prerenderAllMoviesPage() {
  const filePath = path.join(PAGES_DIR, "all-movies.html")
  if (!fs.existsSync(filePath)) return

  let html = fs.readFileSync(filePath, "utf8")
  const movies = flattenPopularItems(popularMovies, "movie").filter(
    (movie) => movie.title,
  )
  const routesById = createMovieRouteMap(movies)
  const pageHrefById = new Map(
    movies.map((movie) => [
      movie.id,
      routesById.get(movie.id)?.urlPath ||
        normalizePagePath(`/pages/about-movie/${movie.id}`),
    ]),
  )

  const cardsHtml = movies
    .map((movie) => {
      const mediaType = movie.media_type === "tv" ? "tv" : "movie"
      const label = mediaType === "tv" ? "Сериал" : "Фильм"
      const year = String(movie.release_date || "").slice(0, 4)
      const title = movie.title || movie.original_title
      const original =
        movie.original_title && movie.original_title !== movie.title
          ? movie.original_title
          : ""
      const deepLink = `${TELEGRAM_CARD_LINK_PREFIX}${movie.id}-${mediaType}-lnd`
      const pageHref = pageHrefById.get(movie.id)

      return `<article class="movieCard">
            <div class="movieCardHead">
                <span class="movieCardBadge">${escapeHtml(label)}</span>
                ${year ? `<span class="movieCardYear">${escapeHtml(year)}</span>` : ""}
            </div>
            <h3 class="movieCardTitle">${escapeHtml(title)}</h3>
            ${original ? `<p class="movieCardOriginal">${escapeHtml(original)}</p>` : ""}
            <p class="movieCardText">${escapeHtml(truncateOverview(movie.overview))}</p>
            <div class="movieCardActions">
                <a class="start-btn" href="${escapeHtml(deepLink)}" target="_blank" rel="noopener">TELEGRAM</a>
                <a class="movieCardLink" href="${escapeHtml(encodeURI(pageHref))}">Страница →</a>
            </div>
        </article>`
    })
    .join("")

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${BASE_URL}/pages/all-movies.html`,
        url: `${BASE_URL}/pages/all-movies.html`,
        name: "Все фильмы и сериалы — карточки каталога | Докопатыч",
        inLanguage: "ru",
      },
      {
        "@type": "ItemList",
        itemListElement: movies.slice(0, 100).map((movie, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: movie.title || movie.original_title,
          url: encodeURI(`${BASE_URL}${pageHrefById.get(movie.id)}`),
        })),
      },
    ],
  }

  let changed = false

  if (html.includes("<span data-movies-count>")) {
    html = html.replace(
      /(<span data-movies-count>)[\s\S]*?(<\/span>)/,
      `$1${movies.length} позиций$2`,
    )
    changed = true
  }

  if (html.includes('<div class="movieCards" data-movie-cards>')) {
    html = replaceElementInnerContent(
      html,
      '<div class="movieCards" data-movie-cards>',
      cardsHtml,
      "div",
    )
    changed = true
  }

  const withJsonLd = replaceJsonLdScript(html, jsonLd)
  if (withJsonLd !== html) {
    html = withJsonLd
    changed = true
  }

  if (changed) {
    fs.writeFileSync(filePath, html)
    console.log(`Prerendered ${movies.length} cards into all-movies.html.`)
  }
}

function prerenderFilmDownloadPage() {
  const filePath = path.join(PAGES_DIR, "film-download-bot.html")
  if (!fs.existsSync(filePath)) return

  let html = fs.readFileSync(filePath, "utf8")
  if (!html.includes("<ul data-popular-movies>")) return

  const movies = flattenPopularItems(popularMovies, "movie").filter(
    (movie) => movie.title,
  )
  const routesById = createMovieRouteMap(movies)
  const listHtml = movies
    .slice(0, 20)
    .map((movie) => {
      const href =
        routesById.get(movie.id)?.urlPath ||
        normalizePagePath(`/pages/about-movie/${movie.id}`)
      return `<li><a href="${escapeHtml(encodeURI(href))}">${escapeHtml(movie.title || movie.original_title)}</a></li>`
    })
    .join("")

  const nextHtml = replaceElementInnerContent(
    html,
    "<ul data-popular-movies>",
    listHtml,
    "ul",
  )

  if (nextHtml !== html) {
    fs.writeFileSync(filePath, nextHtml)
    console.log("Prerendered popular movies into film-download-bot.html.")
  }
}

// ---------- llms.txt ----------

function decodeHtmlEntities(value) {
  return String(value)
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
}

function extractPageMeta(html) {
  const title =
    html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim().replace(/\s+/g, " ") ||
    ""
  const description =
    html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1] || ""

  return {
    title: decodeHtmlEntities(title),
    description: decodeHtmlEntities(description),
  }
}

function writeLlmsTxt() {
  const groups = [
    { dir: null, title: "Основные страницы", pages: [] },
    { dir: "about-movie", title: "Каталог фильмов и сериалов", pages: [] },
    { dir: "audiobooks", title: "Аудиокниги", pages: [] },
    { dir: "games", title: "Игры", pages: [] },
    { dir: "music", title: "Музыкальные альбомы", pages: [] },
    { dir: "books", title: "Книги", pages: [] },
  ]
  const groupByDir = new Map(
    groups.filter((group) => group.dir).map((group) => [group.dir, group]),
  )

  const addPage = (relativePath, html) => {
    const meta = extractPageMeta(html)
    if (!meta.title) return

    const url = encodeURI(toAbsoluteUrl(`/${relativePath}`))
    const match = relativePath.match(/^pages\/([^/]+)\/(index\.html|[^/]+\/index\.html)$/)

    if (match && groupByDir.has(match[1]) && match[2] !== "index.html") {
      groupByDir.get(match[1]).pages.push({ url, ...meta })
    } else {
      groups[0].pages.push({ url, ...meta })
    }
  }

  const rootHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8")
  groups[0].pages.push({ url: encodeURI(`${BASE_URL}/`), ...extractPageMeta(rootHtml) })

  readAllHtmlPages(PAGES_DIR, { withPaths: true }).forEach(({ relativePath }) => {
    const filePath = path.join(ROOT, relativePath)
    addPage(relativePath, fs.readFileSync(filePath, "utf8"))
  })

  const lines = [
    "# Докопатыч — Telegram-бот для поиска фильмов, сериалов, музыки, аудиокниг, игр и файлов",
    "",
    "> Бесплатный Telegram-бот @DokopatychBot: пользователь присылает название фильма, сериала, альбома, аудиокниги, игры или любого файла — бот находит варианты и присылает подборки похожего. Небольшие файлы скачиваются прямо в боте, для больших бот отдаёт торрент-файл. Данные о фильмах и сериалах — из TMDB.",
    "",
    "Сайт dokopatych.vercel.app — лендинг и каталоги бота. Каждая позиция каталога имеет отдельную страницу с описанием и быстрой ссылкой на поиск в боте.",
    "",
  ]

  groups.forEach((group) => {
    if (!group.pages.length) return

    lines.push(`## ${group.title}`, "")
    group.pages.forEach((page) => {
      lines.push(`- [${page.title}](${page.url})${page.description ? `: ${page.description}` : ""}`)
    })
    lines.push("")
  })

  fs.writeFileSync(path.join(ROOT, "llms.txt"), `${lines.join("\n").trimEnd()}\n`)
}

function isIndexablePage(relativePath) {
  return !NON_INDEXED_PAGE_PATTERNS.some((pattern) => pattern.test(relativePath))
}

function readAllHtmlPages(dir = PAGES_DIR, options = {}) {
  if (!fs.existsSync(dir)) {
    return []
  }

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      return readAllHtmlPages(entryPath, options)
    }

    if (!entry.isFile() || !entry.name.endsWith(".html")) {
      return []
    }

    const relativePath = path.relative(ROOT, entryPath).split(path.sep).join("/")
    if (!isIndexablePage(relativePath)) {
      return []
    }

    if (options.withPaths) {
      return [{ relativePath }]
    }

    if (relativePath === "index.html") {
      return [toAbsoluteUrl("/")]
    }

    return [toAbsoluteUrl(`/${relativePath}`)]
  })
}

function getUrlSectionOrder(url) {
  const pathname = new URL(url).pathname
  const index = LINK_SECTIONS.findIndex(({ prefix }) =>
    prefix === "/" ? pathname === "/" : pathname.startsWith(prefix),
  )

  return index === -1 ? LINK_SECTIONS.length : index
}

function sortUrlsBySection(urls) {
  return [...urls].sort((a, b) => {
    const sectionDiff = getUrlSectionOrder(a) - getUrlSectionOrder(b)
    if (sectionDiff !== 0) {
      return sectionDiff
    }

    return a.localeCompare(b, "ru")
  })
}

function buildSitemapEntry({ loc, changefreq, priority }) {
  return `  <url><loc>${encodeURI(loc)}</loc><lastmod>${TODAY}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`
}

function writeSitemap() {
  const pageUrls = readAllHtmlPages()
  const autoPages = pageUrls.map((loc) => {
    const knownPage = SEO_BASE_PAGES_BY_LOC.get(loc)
    if (knownPage) {
      return knownPage
    }

    return {
      loc,
      changefreq: "weekly",
      priority: "0.7",
    }
  })

  const pages = [SEO_BASE_PAGES[0], ...autoPages]
  const dedupedPages = [
    ...new Map(pages.map((page) => [page.loc, page])).values(),
  ]
  const entries = dedupedPages.map(buildSitemapEntry).join("\n")
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`
  fs.writeFileSync(SITEMAP_PATH, sitemap)
}

function writeLinksList() {
  const pageUrls = readAllHtmlPages()
  const allUrls = [`${BASE_URL}/`, ...pageUrls]
  const dedupedUrls = [...new Set(allUrls)]
  fs.writeFileSync(LINKS_LIST_PATH, `${sortUrlsBySection(dedupedUrls).join("\n")}`)
}

const flatPopularMovies = flattenPopularItems(popularMovies, "movie")
writeCollectionPages()
prerenderIntentPages()
prerenderAllMoviesPage()
prerenderFilmDownloadPage()
writeSitemap()
writeLinksList()
writeLlmsTxt()

console.log(
  `Generated ${flatPopularMovies.length} SEO pages, refreshed sitemap, llms.txt, and wrote links list.`,
)
