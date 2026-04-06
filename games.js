const popularGames = [
]

if (typeof window !== 'undefined') {
	window.popularGames = popularGames;
}

if (typeof module !== 'undefined' && module.exports) {
	module.exports = { popularGames };
}
