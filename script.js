const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const detectDevice = () => {
	const userAgent = navigator.userAgent.toLowerCase();
	return /iphone|ipad|ipod|android|blackberry|opera mini|iemobile|mobile/.test(userAgent);
};

const getPreferredLanguage = () => {
	const locale = (navigator.language || navigator.userLanguage || '').toLowerCase();
	return locale.startsWith('ru') ? 'ru' : 'en';
};

const applyLocalizedContent = (lang) => {
	const contentByLanguage = {
		ru: {
			title: 'Докопатыч — поиск фильмов, музыки, игр и файлов в Telegram',
			description: 'Телеграм-бот для поиска музыки, аудиокниг, фильмов, сериалов, игр и других файлов. Для небольших файлов доступна загрузка в боте, для больших — торрент-файл.',
			applicationName: 'Докопатыч | Поиск музыки, фильмов, игр и файлов',
			botName: 'Докопатыч',
			heroDescription: 'Бот для быстрого поиска кино <br /><br />In memory of Jeff Baena',
			slides: [
				'Ищешь, что посмотреть',
				'Вспоминаешь, какой фильм или сериал стал для тебя родным',
				'Присылаешь его мне',
				'Прогоняю через алгоритм и подбираю тебе что-то ещё наподобие',
				'Темы разные. Главное, чтобы вайб был "как тогда"',
				'Выбирай по обложке, выбирай сердечком',
			],
			faq1Title: 'Я делаю проще откапывание фильмов и сериалов 🎬🪤🐻',
			faq1Body: 'Ты присылаешь мне фильм или сериал, а я собираю тебе несколько списков с чем-то, что может тебе тоже понравиться. Часто попадаются малоизвестные фильмы и сериалы, которые смотрели полтора человека на планете, но они хороши.',
			faq2Title: 'Как я подбираю',
			faq2Body: 'У меня мега хитрый алгоритм с использованием квантовых вычислений и секретных методик фбр. Картины могут быть не связаны темами или жанрами, здесь связь более глубокая. Рекомендации часто неожиданные. Если тебе интересны просто темы космоса или пиратов, то лучше обратиться к гуглу или gpt.<br /><br />Но если ты ищешь что-то, что вовлечёт тебя <b>✨как тогда✨</b>, то здесь ко мне🫡',
			faq3Title: 'Как выбирать',
			faq3Body: 'Рекомендую ориентироваться только на название и обложку, выбирай сердечком🫀',
			faq4Title: 'Кто такой этот ваш Джефф Баена',
			faq4Body: 'Это малоизвестный инди-сценарист и режиссёр, он упоминается в описании бота. Автору бота хотелось бы, чтобы такие как Джефф получали больше внимания при жизни, не смотря на низкую распиаренность.',
			faq5Title: 'Откуда столько фильмов',
			faq5Body: 'Источник сырых данных для алгоритма: TMDB. Он самый запаристый, самый наполненный и актуальный, есть вообще всё. Не стесняйся искать что угодно.',
			faq6Title: 'Страницы по категориям',
			faq6Body: 'Если ты ищешь конкретный формат, переходи сразу на нужную страницу:',
			categories: [
				'Поиск музыки в Telegram',
				'Поиск аудиокниг в Telegram',
				'Поиск фильмов и сериалов',
				'Поиск игр и больших файлов',
				'Поиск любых файлов без авторизации',
			],
			mobileCta: 'START',
		},
		en: {
			title: 'Dokopatych — find movies, music, games, and files in Telegram',
			description: 'Telegram bot for finding music, audiobooks, movies, TV shows, games, and other files. Small files can be downloaded in the bot, large files are provided via torrent.',
			applicationName: 'Dokopatych | Search music, movies, games, and files',
			botName: 'Dokopatych',
			heroDescription: 'Bot for fast movie picks <br /><br />In memory of Jeff Baena',
			slides: [
				'Looking for something to watch',
				'Remembering a movie or series that felt like home',
				'Send it to me',
				'I run it through the algorithm and suggest something with a similar vibe',
				'The themes can differ. The main thing is to match that "just like then" feeling',
				'Pick by the cover, pick with your heart',
			],
			faq1Title: 'I make digging up movies and shows easier 🎬🪤🐻',
			faq1Body: 'You send me a movie or TV show, and I build several lists with similar things you might like. You will often see under-the-radar picks that very few people have seen, but they are great.',
			faq2Title: 'How I recommend',
			faq2Body: 'I use a super tricky algorithm powered by quantum computing and top-secret FBI techniques. Titles may not match by genre or topic — the connection is deeper. Recommendations are often unexpected. If you just want space or pirate themes, Google or GPT is likely a better fit.<br /><br />But if you are looking for something that pulls you in <b>✨like before✨</b>, I am your bot🫡',
			faq3Title: 'How to choose',
			faq3Body: 'I suggest focusing only on the title and cover — choose with your heart🫀',
			faq4Title: 'Who is Jeff Baena',
			faq4Body: 'He is an under-the-radar indie screenwriter and director mentioned in the bot description. The bot author wishes creators like Jeff got more attention while they are still here, even without heavy promotion.',
			faq5Title: 'Where all these movies come from',
			faq5Body: 'Raw data source for the algorithm: TMDB. It is the deepest and most up-to-date catalog with almost everything in it. Feel free to search for anything.',
			faq6Title: 'Category pages',
			faq6Body: 'If you are looking for a specific format, jump directly to the matching page:',
			categories: [
				'Music search in Telegram',
				'Audiobook search in Telegram',
				'Movie and TV search',
				'Game and large file search',
				'Any-file search without authorization',
			],
			mobileCta: 'START',
		},
	};

	const t = contentByLanguage[lang] || contentByLanguage.ru;
	const applyText = (selector, value, isHtml = false) => {
		const element = document.querySelector(selector);
		if (!element || typeof value !== 'string') return;
		if (isHtml) {
			element.innerHTML = value;
			return;
		}
		element.textContent = value;
	};

	document.documentElement.lang = lang;
	document.title = t.title;

	const setMetaContent = (selector, value) => {
		const element = document.querySelector(selector);
		if (element) element.setAttribute('content', value);
	};

	setMetaContent('meta[name="description"]', t.description);
	setMetaContent('meta[name="application-name"]', t.applicationName);
	setMetaContent('meta[property="og:title"]', t.applicationName);
	setMetaContent('meta[property="og:site_name"]', t.applicationName);
	setMetaContent('meta[property="og:description"]', t.description);

	applyText('#botName', t.botName);
	applyText('#heroDescription', t.heroDescription, true);

	t.slides.forEach((slide, index) => applyText(`#slide-${index + 1}`, slide));
	applyText('#faq-1-title', t.faq1Title);
	applyText('#faq-1-body', t.faq1Body);
	applyText('#faq-2-title', t.faq2Title);
	applyText('#faq-2-body', t.faq2Body, true);
	applyText('#faq-3-title', t.faq3Title);
	applyText('#faq-3-body', t.faq3Body);
	applyText('#faq-4-title', t.faq4Title);
	applyText('#faq-4-body', t.faq4Body);
	applyText('#faq-5-title', t.faq5Title);
	applyText('#faq-5-body', t.faq5Body);
	applyText('#faq-6-title', t.faq6Title);
	applyText('#faq-6-body', t.faq6Body);
	t.categories.forEach((category, index) => applyText(`#category-${index + 1}`, category));

	return t;
};

const selectedLanguage = getPreferredLanguage();
const localizedContent = applyLocalizedContent(selectedLanguage);

const qrBtn = document.querySelector('[id="qrBtn"]');
const tooltip = document.querySelector('[id="tooltip"]');

qrBtn.addEventListener('click', (e) => {
	e.preventDefault();
	tooltip.classList.toggle('tooltipShow');
});

document.addEventListener('click', (click) => {
	const shownTooltip = document.querySelector('[class="tooltip tooltipShow"]');
	if (shownTooltip && click.target.id !== 'qrBtn') {
		shownTooltip.classList.toggle('tooltipShow');
	}
});

const btns = document.querySelector('[class="btns-container"]');
const isMobile = detectDevice() || window.matchMedia('(max-width: 768px)').matches;

if (isMobile && btns) {
	btns.innerHTML = `<a href="https://t.me/DokopatychBot" class="start-btn" target="_blank">${localizedContent.mobileCta}</a>`;
}
