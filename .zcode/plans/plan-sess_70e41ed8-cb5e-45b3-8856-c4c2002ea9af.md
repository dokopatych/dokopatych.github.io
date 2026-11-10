# /addPop — добавление фильма на лендинг из getTorrentFileBot

## Context

Сейчас фильмы на лендинге `dokopatych.github.io` пополняются руками: нужно самому найти TMDB-данные (RU-название, описание, дату, тип) и вписать их в `movies.js`. Вся обвязка для этого уже есть в `ap-dev` — `sendPopularMoviesToSupportBot`/`getPoplularMoviesForLanding` (`src/workers/popular-movies.js`) собирают ровно эту метадату из TMDB, а в том же файле лежит TODO «сделать сохранение… обновит билд лендинга». Задача: команда `/addPop https://www.imdb.com/title/tt8014982` в локальном боте `getTorrentFileBot`, доступная только ME, которая добавляет фильм в `movies.js` и публикует лендинг — полный цикл, как `/pr`.

Схема записи в `movies.js` (6 полей, фикс. порядок): `id` (TMDB), `original_title`, `title` (RU), `overview` (RU), `media_type` ('movie'|'tv'), `release_date`. Деплой: push в `main` → Vercel отдаёт статику как есть, билд — `node scripts/generate.js` (перегенеряет `pages/about-movie/*`, section-index, `sitemap.xml`, `all-links.txt`).

**Принятые решения** (вопросы остались без ответа, взяты рекомендованные варианты — скажи, если нужно иначе):
1. Полный цикл: movies.js → generate → git commit → git push.
2. Новый фильм вставляется **в начало** массива (как Silo — попадает в топ-20 на лендинге).
3. Дубль Project Hail Mary (id 687163, вторая копия в конце файла) удаляется отдельной правкой.

## Изменения в `/Users/lobster/repos/ap-dev`

**1. `src/constants.js`** — рядом с `ME` (строка 597):
```js
export const LANDING_REPO_PATH = '/Users/lobster/repos/dokopatych.github.io'
```

**2. `src/botConfig.js`** — в `ADM_BOT_COMMANDS` (строка 89): `addPopular: '/addPop'`.

**3. `src/workers/popular-movies.js`** — новая функция `addMovieToLanding({ imdbLink })` (логика лендинга уже живёт здесь):
- распознавание ссылки через существующий `processUserMovieMessage(imdbLink)` (`src/workers/movie.js:33`, использует `SOURCES.imdb.regex` → TMDB `/find`); при ошибке — вернуть её текст;
- русские данные одним вызовом `getNormalizedDetails(movieObj, { settings: { isEng: false } })` (`movie.js:152`, тот же приём, что в `/pr`-флоу `what-movie-am-i.js:104`) → RU `title`/`overview`/`release_date`;
- дедуп: читать текст `movies.js` и проверить наличие `"id": <id>` (regex, без require — файл правится вручную, парсить его не надо);
- текстовая вставка нового блока сразу после `const popularMovies = [` — формат как у текущих верхних записей (tab + `{`, поля с 8 пробелами, `      },`), строковые поля через `JSON.stringify` (корректно экранирует `\n`, кавычки);
- публикация через `execFile` с `cwd: LANDING_REPO_PATH`: `node scripts/generate.js` → `git add -A` → `git commit -m "add <RU title>"` → `git push`;
- вернуть итог: добавлено / уже было / ошибка + название и дата.

**4. `src/auto-product/file-parsers/torrent-bot.js`** — в обработчике `bot.on('text')` сразу после блока `/captcha` (строка 53, до `createUser`, чтобы команда не создавала юзеров):
```js
if (messageText.startsWith(ADM_BOT_COMMANDS.addPopular) && thisMessage.from?.id === ME) {
    const imdbLink = messageText.replace(ADM_BOT_COMMANDS.addPopular, '').trim()
    // вызов addMovieToLanding, ответы в чат ME: «✅ Добавила …» / «уже есть» / ошибка
    return
}
```
Проверка `from?.id === ME` — тот же паттерн «только для ME», что у `/captcha` и `handleFreeAccessRequest` (torrent-bot.js:14).

## Нюансы

- В рабочем дереве лендинга уже лежат 40 незакоммиченных записей — первый коммит бота включит их и перегенерённые страницы (это нормально: их всё равно нужно публиковать, и история репозитория — commits «rebuild» — так и делает).
- `USE_PROXY = IS_LOCAL` → TMDB-запросы пойдут через Tor (`socks5h://127.0.0.1:9150`), как и весь остальной локальный флоу бота — Tor должен быть запущен.
- Команда активна, когда бот запущен в `BOT_ENV=local-prod` (режим getTorrentFileBot).

## Verification

1. Убрать дубль Project Hail Mary в `movies.js`.
2. Запустить бота локально (`BOT_ENV=local-prod`, `npm run bot:local`), отправить `/addPop https://www.imdb.com/title/tt8014982`.
3. Проверить: ответ бота с названием/датой; в `movies.js` новая запись стоит первой; `git log` в лендинге — коммит «add …» с перегенерёнными `pages/about-movie/*`, `sitemap.xml`; после пуша — страница `https://dokopatych.vercel.app/pages/about-movie/<slug>` живая.
4. Повторно отправить ту же ссылку → ответ «уже есть в списке», без коммита.