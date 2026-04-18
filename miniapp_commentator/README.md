# Mini App: Комментарии для постов MAX

Готовое мини-приложение для GitHub Pages.  
Комментарии хранятся **отдельно для каждого поста** по ключу `post_id` (или `start_param` из MAX Bridge).

## Что внутри
- `index.html` — UI в стиле MAX (темная тема, карточки, composer).
- `styles.css` — стили.
- `app.js` — логика:
  - чтение `post_id` из query (`?post_id=...`);
  - fallback на `window.WebApp.initDataUnsafe.start_param`;
  - работа с серверным API комментариев (`/api/comments`) при `api_base`;
  - fallback в `localStorage`, если API недоступен;
  - отправка, сортировка, удаление своих комментариев, share.

## Серверный режим (общие комментарии у всех)
В `bot_commentator` добавлен HTTP API:
- `GET /api/health`
- `GET /api/comments?post_id=<id>`
- `POST /api/comments`
- `DELETE /api/comments/<comment_id>?author_id=<author_id>`
- `DELETE /api/comments?post_id=<id>`

Mini-app подключается к API через query-параметр `api_base`.

## Публикация на GitHub Pages
1. Создай репозиторий, например `max-commentator-miniapp`.
2. Залей содержимое папки `miniapp_commentator`.
3. В GitHub: `Settings -> Pages -> Deploy from branch -> main /(root)`.
4. Получишь URL вида:
   - `https://<username>.github.io/max-commentator-miniapp/`

## Подключение к боту MAX
В кнопку mini-app передавай payload/start_param с идентификатором поста.

### Варианты открытия
- `https://<username>.github.io/max-commentator-miniapp/?post_id=<MESSAGE_ID>&api_base=https://<your-api-domain>`
- либо через MAX start param:
  - `https://max.ru/<botName>?startapp=post_<MESSAGE_ID>`

## Пример идеи для payload
- `post_abc123`
- `post=abc123`
- `abc123`

Приложение распознает все 3 формата.

## Локальная разработка mini-app (без бота)
1. Открой терминал в папке `miniapp_commentator`.
2. Запусти статический сервер:
   - `python -m http.server 5500`
3. Открой:
   - `http://localhost:5500/?post_id=test-post`

Это режим UI-редактирования (fallback на localStorage).

## Локальная проверка с серверной БД
1. Запусти бота/API из `bot_commentator`:
   - `python main.py`
2. Открой mini-app:
   - `http://localhost:5500/?post_id=test-post&api_base=http://localhost:8081`

Теперь комментарии пишутся в SQLite бота и общие для всех клиентов, работающих с тем же API.
