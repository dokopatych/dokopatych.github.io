const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const texts = document.querySelectorAll('[class="carousel"]>h2')
let index = 0;
let isPaused = false;
let interval;

async function showNextPhrase() {
	if (isPaused) return;

	const current = texts[index];
	current.style.transform = "translateX(-100%)";
	current.style.opacity = "0";

	await sleep(600);

	index = (index + 1) % texts.length;
	const next = texts[index];

	next.style.transition = "none";
	next.style.transform = "translateX(100%)";

	await sleep(50);

	next.style.transition = "transform 0.6s ease-out, opacity 0.6s ease-out";
	next.style.transform = "translateX(0%)";
	next.style.opacity = "1";
}

async function startAutoChange() {
	interval = setInterval(showNextPhrase, 4000);
}

function stopAutoChange() {
	clearInterval(interval);
}

document.querySelector(".carousel").addEventListener("click", () => {
	isPaused = false;
	showNextPhrase();
});

texts.forEach((text) => {
	text.addEventListener("mouseenter", () => {
		isPaused = true;
		stopAutoChange();
	});

	text.addEventListener("mouseleave", () => {
		isPaused = false;
		startAutoChange();
	});
});

// Изначально показываем первую фразу и запускаем смену 
startAutoChange();


const qrBtn = document.querySelector('[id="qrBtn"]')
const tooltip = document.querySelector('[id="tooltip"]')

qrBtn.addEventListener('click', (e) => {
	e.preventDefault();
	tooltip.classList.toggle('tooltipShow')
});

document.addEventListener('click', (click) => {
	const shownTooltip = document.querySelector('[class="tooltip tooltipShow"]')
	if (shownTooltip) {
		if (click.target.id != "qrBtn") {
			shownTooltip.classList.toggle('tooltipShow')
		}
	}
});
// an
/*
document.querySelector(`[class="start-btn"]`).addEventListener("click", function () {
	gtag('event', 'telegram_click', {
		'event_category': 'Engagement',
		'event_label': 'Telegram Redirect'
	});
});

window.addEventListener('scroll', function () {
	gtag('event', 'scroll', { 'event_category': 'User Engagement' });
}, { once: true });

setTimeout(() => {
	gtag('event', 'page_engagement', { 'event_category': 'User Engagement' });
}, 5000);
*/

// page
function detectDevice() {
	const userAgent = navigator.userAgent.toLowerCase();
	return /iphone|ipad|ipod|android|blackberry|opera mini|iemobile|mobile/.test(userAgent);
}
const btns = document.querySelector('[class="btns-container"]')
const isMobile = detectDevice() || window.matchMedia("(max-width: 768px)").matches;


if (isMobile) {
	btns.innerHTML =
		`<a href="https://t.me/DokopatychBot" class="start-btn" target="_blank">START </a> `
}

