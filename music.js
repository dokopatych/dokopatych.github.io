const popularMusic = [
	{
		"id": 1,
		"original_title": "Raye - This Music May Contain Hope",
		"overview": "Raye - This Music May Contain Hope. (Pop / R&B / Soul / Dance) - 2026, MP3, 320 kbps",
		"media_type": "music",
		"release_date": "2026-03-26"
	}
]

if (typeof window !== 'undefined') {
	window.popularMusic = popularMusic;
}

if (typeof module !== 'undefined' && module.exports) {
	module.exports = { popularMusic };
}
