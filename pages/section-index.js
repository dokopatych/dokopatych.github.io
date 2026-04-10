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
