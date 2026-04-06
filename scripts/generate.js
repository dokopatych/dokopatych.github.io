const fs = require("fs")
const path = require("path")
const { popularMovies } = require("../movies.js")
const { movieQueries, tvQueries } = require("../keys.js")
const {
  createMovieRouteMap,
  normalizePagePath,
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

const NON_INDEXED_PAGE_PATTERNS = [/^pages\/skachat-film-.*\.html$/]
const LINK_SECTIONS = [
  { key: "root", prefix: "/" },
  { key: "about-movie", prefix: "/pages/about-movie/" },
  { key: "audiobooks", prefix: "/pages/audiobooks/" },
  { key: "pages", prefix: "/pages/" },
]

const SEO_BASE_PAGES = [
  { loc: `${BASE_URL}/`, changefreq: "daily", priority: "1.0" },
  // { loc: `${BASE_URL}/pages/music-search-bot`, changefreq: 'weekly', priority: '0.9' },
  { loc: `${BASE_URL}/pages/audiobook-search-bot`, changefreq: "weekly", priority: "0.9" },
  // { loc: `${BASE_URL}/pages/film-download-bot`, changefreq: 'weekly', priority: '0.9' },
  // { loc: `${BASE_URL}/pages/game-search-bot`, changefreq: 'weekly', priority: '0.9' },
  // { loc: `${BASE_URL}/pages/file-search-bot`, changefreq: 'weekly', priority: '0.9' },
  // { loc: `${BASE_URL}/pages/skachat-albom-artista`, changefreq: 'weekly', priority: '0.8' },
  // { loc: `${BASE_URL}/pages/skachat-audioknigu-nazvanie`, changefreq: 'weekly', priority: '0.8' },
  // { loc: `${BASE_URL}/pages/skachat-serial-nazvanie`, changefreq: 'weekly', priority: '0.8' },
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

function moviePagePath(movie, movieRoutesById) {
  return movieRoutesById.get(movie.id)?.urlPath || `/pages/about-movie/${movie.id}`
}

function moviePageFilePath(movie, movieRoutesById) {
  return path.join(ROOT, moviePagePath(movie, movieRoutesById), "index.html")
}

function toAbsoluteUrl(relativePath) {
  return `${BASE_URL}${normalizePagePath(relativePath)}`
}

function rootAsset(asset) {
  return ROOT_ASSETS[asset]
}

function resolveMediaType(mediaType) {
  return mediaType === "tv" ? "tv" : "movie"
}

function resolveMediaCopy(mediaType) {
  return MEDIA_COPY[resolveMediaType(mediaType)]
}

function movieDeepLink(movie) {
  const media = resolveMediaCopy(movie.media_type)
  return `https://t.me/DokopatychBot?start=searchTr-${movie.id}-${media.telegramType}-lnd`
}

function movieDesktopDeepLink(movie) {
  const webLink = movieDeepLink(movie)
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
      const lowerQuery = query.toLowerCase()
      const score = titleTokens.reduce(
        (acc, token) => acc + (lowerQuery.includes(token) ? 1 : 0),
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

function buildIntentConfig(movie, tagCloudQueries, movieRoutesById) {
  const quotedTitle = `«${movie.title}»`
  const media = resolveMediaCopy(movie.media_type)
  const queryHighlights = tagCloudQueries.slice(0, 6)
  const link = movieDeepLink(movie)

  return {
    title: `Скачать ${media.nounAccusative} ${quotedTitle} — через Telegram-бота | Докопатыч`,
    url: toAbsoluteUrl(moviePagePath(movie, movieRoutesById)),
    h1: `Скачать ${media.nounAccusative} ${quotedTitle}`,
    h2: `${media.nounAccusative} ${quotedTitle}`,
    description: `${movie.overview}`,
    queryExample: `скачать ${media.nounAccusative} ${movie.title}`,
    about: `<a href="${link}">Скачать ${media.nounAccusative} ${quotedTitle}</a> нужно через Telegram-бота, он выдаст торрент файл`,
    queries: queryHighlights.length
      ? `Подходят запросы: ${queryHighlights.join(", ")}.`
      : `Подходят запросы: скачать ${media.nounAccusative} ${movie.title}, ${movie.title} торрент, ${movie.title} ${media.nounAccusative} скачать, ${movie.title} Telegram.`,
    flow: `Страница ведёт в Telegram-бота, где заранее подставлен ID ${media.nounGenitive}. Это сокращает путь от запроса до релевантной выдачи.`,
    popularTitle: `Популярные ${media.headingPlural} недели`,
    applicationName: media.applicationName,
    tagCloudTitle: "С какими запросами обычно приходят к боту",
    tagCloudQueries,
  }
}

function mapMovieForIntentLink(movie, movieRoutesById) {
  const route = movieRoutesById.get(movie.id)

  if (!route) {
    return movie
  }

  return { ...movie, id: route.slug }
}

function buildMoviePageHtml(movie, movieRoutesById) {
  const config = buildIntentConfig(
    movie,
    pickTagCloudQueries(movie),
    movieRoutesById,
  )
  const configJson = JSON.stringify(config)
  const relatedMoviesForIntent = JSON.stringify(
    flattenPopularMovies(popularMovies)
      .filter((item) => item.id !== movie.id)
      .map((item) => mapMovieForIntentLink(item, movieRoutesById)),
  )

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
    <meta property="og:url" content="${escapeHtml(config.url)}" />
    <meta property="og:type" content="website" />
    <link rel="canonical" href="${escapeHtml(config.url)}">
    <link rel="icon" href="https://dokopatych.vercel.app/images/round-sm.ico" type="image/x-icon">
    <link rel="shortcut icon" href="https://dokopatych.vercel.app/images/round-sm.ico" />
    <link rel="stylesheet" href="${rootAsset("styles")}" />
    <script type="application/ld+json" data-jsonld></script>

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
                <a href="${movieDeepLink(movie)}" class="start-btn" target="_blank" rel="noopener">WEB</a>
                <a href="${movieDesktopDeepLink(movie)}" class="start-btn">DESKTOP</a>
            </div>
        </div>
        <div class="faq" data-faq></div>
        <div class="faq">
            <div class="faqCard"><h3>${escapeHtml(config.popularTitle)}</h3><ul data-popular-movies></ul></div>
        </div>
    </div>
    <script src="${rootAsset("movies")}"></script>
    <script>
        window.INTENT_PAGE_CONFIG = ${configJson};
        window.FILM_DOWNLOAD_PAGE_CONFIG = {
            movies: ${relatedMoviesForIntent},
            limit: 10,
            linkType: 'intent',
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
          a.href = ${JSON.stringify(movieDeepLink(movie))};
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

function flattenPopularMovies(source) {
  return source
    .flat(Infinity)
    .filter((item) => item && typeof item === "object" && item.id && item.title)
}

function writeMoviePages() {
  const movies = flattenPopularMovies(popularMovies)
  const movieRoutesById = createMovieRouteMap(movies)
  fs.rmSync(ABOUT_MOVIE_DIR, { recursive: true, force: true })

  movies.forEach((movie) => {
    const filePath = moviePageFilePath(movie, movieRoutesById)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, buildMoviePageHtml(movie, movieRoutesById))
  })
}

function isIndexablePage(relativePath) {
  return !NON_INDEXED_PAGE_PATTERNS.some((pattern) => pattern.test(relativePath))
}

function readAllHtmlPages(dir = PAGES_DIR) {
  if (!fs.existsSync(dir)) {
    return []
  }

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      return readAllHtmlPages(entryPath)
    }

    if (!entry.isFile() || !entry.name.endsWith(".html")) {
      return []
    }

    const relativePath = path.relative(ROOT, entryPath).split(path.sep).join("/")
    if (!isIndexablePage(relativePath)) {
      return []
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
  return `  <url><loc>${loc}</loc><lastmod>${TODAY}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`
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

const flatPopularMovies = flattenPopularMovies(popularMovies)
writeMoviePages()
writeSitemap()
writeLinksList()

console.log(
  `Generated ${flatPopularMovies.length} SEO pages, refreshed sitemap, and wrote links list.`,
)
