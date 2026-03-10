const COMMON_NAV_LINKS = [
  { href: '/', label: 'Главная страница' },
  { href: '/music-search-bot.html', label: 'Поиск музыки' },
  { href: '/audiobook-search-bot.html', label: 'Поиск аудиокниг' },
  { href: '/film-download-bot.html', label: 'Поиск фильмов и сериалов' },
  { href: '/game-search-bot.html', label: 'Поиск игр и программ' },
  { href: '/file-search-bot.html', label: 'Поиск файлов и медиа' },
];

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

  const cards = [
    `<div class="faqCard"><h2>${config.h2}</h2><p>${config.description}</p></div>`,
    `<div class="faqCard"><h3>Что это за страница</h3><p>${config.about}</p></div>`,
    `<div class="faqCard"><h3>Какие запросы подходят</h3><p>${config.queries}</p></div>`,
    `<div class="faqCard"><h3>Как работает бот</h3><p>${config.flow}</p></div>`,
    `<div class="faqCard"><h3>Навигация</h3><ul>${COMMON_NAV_LINKS.map((l) => `<li><a href="${l.href}">${l.label}</a></li>`).join('')}</ul></div>`,
  ];

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

function initIntentPage(config) {
  fillMeta(config);
  renderFaq(config);
  renderJsonLd(config);

  const h1 = document.querySelector('[data-h1]');
  if (h1) {
    h1.innerHTML = `${config.h1}<br /><br />Бот для поиска файлов и медиа в Telegram`;
  }
}

if (window.INTENT_PAGE_CONFIG) {
  initIntentPage(window.INTENT_PAGE_CONFIG);
}
