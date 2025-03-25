const phrases = [
	"Вспоминаешь, какой фильм или сериал стал для тебя родным",
	"Присылаешь его мне",
	"Прогоняю через алгоритм и подбираю тебе что-то ещё",
	`Темы разные. Главное, чтобы вайб был "как тогда"`,
	"Выбирай по обложке, выбирай сердечком"
];

const textElement = document.getElementById("carousel-text");
let index = -1;
let interval;
let isPaused = false; // Флаг паузы

function showNextPhrase() {
	if (isPaused) return; // Если пауза, не переключаем

	textElement.style.transform = "translateX(-100%)";
	textElement.style.opacity = "0";

	setTimeout(() => {
		index = (index + 1) % phrases.length;
		textElement.textContent = phrases[index];

		textElement.style.transition = "none"; // Убираем анимацию, чтобы мгновенно переместить вправо
		textElement.style.transform = "translateX(100%)";

		setTimeout(() => {
			textElement.style.transition = "transform 0.6s ease-out, opacity 0.6s ease-out";
			textElement.style.transform = "translateX(0%)";
			textElement.style.opacity = "1";
		}, 50);
	}, 600);
}

function startAutoChange() {
	interval = setInterval(showNextPhrase, 5000);
}

document.querySelector('[class="carousel"]').addEventListener('click', (e) => {
	isPaused = false;
	showNextPhrase();
});

function stopAutoChange() {
	clearInterval(interval);
}

// Запускаем автоматическую смену фраз
startAutoChange();

// Останавливаем анимацию при наведении
textElement.addEventListener("mouseenter", () => {
	isPaused = true;
	stopAutoChange();
});

// Возобновляем анимацию при уходе курсора
textElement.addEventListener("mouseleave", () => {
	isPaused = false;
	startAutoChange();
});

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

