(function () {
  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')
  }

  function setHead(config) {
    document.title = config.title
    const set = (selector, attr, value) => {
      const node = document.querySelector(selector)
      if (node && typeof value === 'string') {
        node.setAttribute(attr, value)
      }
    }

    set('meta[name="description"]', 'content', config.description)
    set('meta[property="og:title"]', 'content', config.title)
    set('meta[property="og:description"]', 'content', config.description)
    set('meta[property="og:url"]', 'content', config.canonical)
    set('link[rel="canonical"]', 'href', config.canonical)
  }

  function renderJsonLd(config) {
    const graph = []

    graph.push({
      '@type': 'WebPage',
      '@id': config.canonical,
      url: config.canonical,
      name: config.title,
      description: config.description,
      inLanguage: 'ru',
    })

    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { name: 'Докопатыч', url: '/' },
        { name: config.h1 || config.title, url: config.canonical },
      ].map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    })

    const items = Array.isArray(config.items) ? config.items : []
    if (items.length) {
      graph.push({
        '@type': 'ItemList',
        itemListElement: items
          .filter((item) => item && item.href && item.label)
          .slice(0, 100)
          .map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: item.href,
            name: item.label,
          })),
      })
    }

    const el = document.querySelector('[data-jsonld]')
    if (el) el.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
  }

  function renderItems(config) {
    const list = document.querySelector('[data-section-list]')
    if (!list) return

    const items = Array.isArray(config.items) ? config.items : []
    if (!items.length) {
      list.innerHTML = `<li>${escapeHtml(config.emptyText || 'Список скоро обновится.')}</li>`
      return
    }

    list.innerHTML = items
      .map((item) => `<li><a href="${item.href}">${escapeHtml(item.label)}</a></li>`)
      .join('')
  }

  function renderNav(config) {
    const nav = document.querySelector('[data-section-nav]')
    if (!nav) return

    const links = Array.isArray(config.navLinks) ? config.navLinks : []
    nav.innerHTML = links
      .map((item) => `<li><a href="${item.href}">${escapeHtml(item.label)}</a></li>`)
      .join('')
  }

  function init() {
    const config = window.SECTION_INDEX_CONFIG
    if (!config) return

    setHead(config)
    renderJsonLd(config)

    const h1 = document.querySelector('[data-section-h1]')
    if (h1 && config.h1) {
      h1.textContent = config.h1
    }

    const description = document.querySelector('[data-section-description]')
    if (description && (config.sectionDescription || config.description)) {
      description.textContent = config.sectionDescription || config.description
    }

    renderItems(config)
    renderNav(config)
  }

  init()
})()
