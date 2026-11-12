(function () {
  const MEDIA_LABELS = {
    movie: "Фильм",
    tv: "Сериал",
  }

  const TELEGRAM_SEARCH_PREFIX =
    "https://t.me/DokopatychBot?start=searchTr-"

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;")
  }

  function truncate(text, limit = 200) {
    const clean = String(text || "").replace(/\s+/g, " ").trim()
    if (clean.length <= limit) {
      return clean
    }

    const cut = clean.slice(0, limit)
    const spaceIndex = cut.lastIndexOf(" ")
    return `${cut.slice(0, spaceIndex > 0 ? spaceIndex : limit)}…`
  }

  function resolveMoviePageHref(movie, routesById) {
    if (window.movieRoutes?.buildMovieIntentPath) {
      return window.movieRoutes.buildMovieIntentPath(movie, routesById)
    }

    return `/pages/about-movie/${encodeURIComponent(movie.id)}`
  }

  function buildCard(movie, routesById) {
    const mediaType = movie.media_type === "tv" ? "tv" : "movie"
    const label = MEDIA_LABELS[mediaType]
    const year = String(movie.release_date || "").slice(0, 4)
    const title = movie.title || movie.original_title
    const original =
      movie.original_title && movie.original_title !== movie.title
        ? movie.original_title
        : ""
    const deepLink = `${TELEGRAM_SEARCH_PREFIX}${movie.id}-${mediaType}-lnd`
    const pageHref = resolveMoviePageHref(movie, routesById)

    return `<article class="movieCard">
            <div class="movieCardHead">
                <span class="movieCardBadge">${escapeHtml(label)}</span>
                ${year ? `<span class="movieCardYear">${escapeHtml(year)}</span>` : ""}
            </div>
            <h3 class="movieCardTitle">${escapeHtml(title)}</h3>
            ${original ? `<p class="movieCardOriginal">${escapeHtml(original)}</p>` : ""}
            <p class="movieCardText">${escapeHtml(truncate(movie.overview))}</p>
            <div class="movieCardActions">
                <a class="start-btn" href="${escapeHtml(deepLink)}" target="_blank" rel="noopener">TELEGRAM</a>
                <a class="movieCardLink" href="${escapeHtml(pageHref)}">Страница →</a>
            </div>
        </article>`
  }

  function renderJsonLd(config) {
    const el = document.querySelector("[data-jsonld]")
    if (!el) return

    const items = config.items
      .slice(0, 100)
      .map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.label,
        url: `https://dokopatych.vercel.app${item.href}`,
      }))

    el.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          "@id": "https://dokopatych.vercel.app/pages/all-movies.html",
          url: "https://dokopatych.vercel.app/pages/all-movies.html",
          name: "Все фильмы и сериалы — карточки каталога | Докопатыч",
          inLanguage: "ru",
        },
        {
          "@type": "ItemList",
          itemListElement: items,
        },
      ],
    })
  }

  function init() {
    const source =
      typeof popularMovies !== "undefined" && Array.isArray(popularMovies)
        ? popularMovies
        : []
    const movies = source.filter(
      (movie) => movie && movie.id && (movie.title || movie.original_title),
    )

    const countNode = document.querySelector("[data-movies-count]")
    if (countNode) {
      countNode.textContent = `${movies.length} позиций`
    }

    const container = document.querySelector("[data-movie-cards]")
    if (!container) return

    // Cards and JSON-LD are prerendered at build time for crawlers.
    if (container.children.length) return

    if (!movies.length) {
      container.innerHTML = `<div class="faqCard">Список скоро обновится.</div>`
      return
    }

    const routesById = window.movieRoutes?.createMovieRouteMap
      ? window.movieRoutes.createMovieRouteMap(movies)
      : null

    container.innerHTML = movies
      .map((movie) => buildCard(movie, routesById))
      .join("")

    renderJsonLd({
      items: movies.map((movie) => ({
        label: movie.title || movie.original_title,
        href: resolveMoviePageHref(movie, routesById),
      })),
    })
  }

  init()
})()
