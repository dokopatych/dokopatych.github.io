const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));



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

