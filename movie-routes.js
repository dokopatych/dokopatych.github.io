(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory()
    return
  }

  globalScope.movieRoutes = factory()
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function normalizePagePath(urlPath) {
    return String(urlPath || "")
      .replace(/\/index\.html$/i, "")
  }

  function slugifyMovieTitle(value) {
    const slug = String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/['"`‘’“”«»]/g, "")
      .replace(/[^a-z0-9а-яё]+/gi, "-")
      .replace(/^-+|-+$/g, "")

    return slug || "movie"
  }

  function createMovieRouteMap(movies) {
    const slugCounts = new Map()

    return new Map(
      movies.map((movie) => {
        const baseSlug = slugifyMovieTitle(movie.original_title || movie.title)
        const count = slugCounts.get(baseSlug) || 0
        slugCounts.set(baseSlug, count + 1)
        const slug = count ? `${baseSlug}-${count + 1}` : baseSlug

        return [movie.id, { slug, urlPath: `/pages/about-movie/${slug}` }]
      }),
    )
  }

  function resolveMovieSlug(movieOrId, movieRoutesById) {
    if (
      movieRoutesById &&
      typeof movieOrId === "object" &&
      movieOrId &&
      Object.prototype.hasOwnProperty.call(movieOrId, "id")
    ) {
      const byId = movieRoutesById.get(movieOrId.id)
      if (byId?.slug) {
        return byId.slug
      }
    }

    if (typeof movieOrId === "object" && movieOrId) {
      return slugifyMovieTitle(
        movieOrId.original_title || movieOrId.title || movieOrId.id,
      )
    }

    return String(movieOrId || "")
  }

  function buildMovieIntentPath(movieOrId, movieRoutesById) {
    const slug = resolveMovieSlug(movieOrId, movieRoutesById)
    return normalizePagePath(`/pages/about-movie/${slug}`)
  }

  return {
    buildMovieIntentPath,
    createMovieRouteMap,
    normalizePagePath,
    slugifyMovieTitle,
  }
})
