const popularBooks = [
]

if (typeof window !== 'undefined') {
	window.popularBooks = popularBooks;
}

if (typeof module !== 'undefined' && module.exports) {
	module.exports = { popularBooks };
}
