# Главная Polkas Tarot · редакционный дизайн

Новая стартовая страница построена вокруг трёх действий: открыть расклад, читать «Карту как зеркало» и вернуться к своим записям. Большой заголовок «Сначала — к себе.» задаёт спокойную интонацию, а живые фактуры связывают три раздела.

## Визуальная система

| Элемент | Решение |
| --- | --- |
| Фон главной | Тёплая бумага, `#f5f1e8` |
| Основной текст | Тёмный кофейный, `#302c24` |
| Акцент | Приглушённая бронза, `#76603d` |
| Главная кнопка | Тёмный оливковый, `#343629` |
| Типографика | Крупная Georgia с системным шрифтом для управления; без загрузки внешних шрифтов |
| Фотографии | Натуральный свет, травертин, лён, дерево; единая тёплая палитра |
| Знак | Овальные линии, нарисованные в SVG и связанные с мотивом зеркала |
| Разделы чтения | Та же светлая палитра; отдельные заголовки и фотографии из общей системы `css/editorial.css` |

Страница содержит первый экран с вопросом и двумя действиями, переходы к 20 раскладам / 78 картам / 34 главам, восемь быстрых схем с точными миниатюрами расположения карт, блок книги, знакомство с атласом, блок дневника и существующие инструменты практики.

На телефоне колонки перестраиваются, фотографии получают отдельное кадрирование средствами CSS, навигация открывается компактным меню, нижняя панель использует подписи и SVG-иконки. Учтены safe-area, экранная клавиатура и системное уменьшение движения. Поле вопроса использует шрифт 16 px, основные элементы управления — высоту от 44 px.

## Фотографии и файлы

Все три фотографии созданы **встроенным imagegen** тремя отдельными генерациями. Изображение книги — художественный макет для представления электронной книги, доступной для чтения на сайте. Сгенерированные рубашки карт служат оформлением; действующая колода и её иллюстрации в раскладах сохранены.

| Изображение | Мобильный файл | Основной файл |
| --- | --- | --- |
| Руки и карты | [quiet-cards-640.webp](../img/editorial/quiet-cards-640.webp) | [quiet-cards-1024.webp](../img/editorial/quiet-cards-1024.webp) |
| Книга и зеркало | [mirror-book-640.webp](../img/editorial/mirror-book-640.webp) | [mirror-book-1280.webp](../img/editorial/mirror-book-1280.webp) |
| Личный дневник | [personal-journal-640.webp](../img/editorial/personal-journal-640.webp) | [personal-journal-1280.webp](../img/editorial/personal-journal-1280.webp) |

Каталог проекта: `/workspace/scratch/b277f05d53da/PolkasTarot-book/img/editorial/`. Оригиналы генераций не перезаписывались. WebP подготовлены с сохранением пропорций; кадрирование в интерфейсе выполняется через `object-fit`. Браузер выбирает размер через `srcset`. Главная фотография имеет высокий приоритет, остальные загружаются лениво. Вместе три мобильных файла весят около 122 КиБ, три основных — около 349 КиБ.

Знак вкладки: [polkas-mark.svg](../img/editorial/polkas-mark.svg). Его геометрия создана в коде.

## Промпты генераций

### Первый экран

```text
Use case: photorealistic-natural.
Asset type: main editorial photograph for the premium Russian tarot and reflective practice website Polkas Tarot, portrait 1024 × 1536.
Create a single exquisitely art-directed, photorealistic magazine photograph. An intimate close-up of a woman's naturally textured hands quietly placing one ivory tarot-sized card onto a small fan of five cards on a warm pale travertine table. Only hands and a little soft ivory linen sleeve are visible, no face. The cards are face down, with elegant very fine muted antique-gold concentric oval linework on uncoated cream paper; no text or identifiable illustrations. A fold of dark tobacco-brown silk rests along one edge of the table. Gentle late afternoon sunlight comes from the upper left, illuminating the fingertips and paper edges and casting long architectural shadows across the stone. Rich amber half-tones, ivory, tobacco, soft olive-grey shadows. Large tactile details, real pores, slight natural film grain, no airbrushing, premium still-life / lifestyle photography on a medium-format camera, calm and unhurried. Composition: the complete hands and cards live in the middle two thirds, photographed from a gently elevated oblique angle, generous stone surface around them; retain the subject when cropped slightly at top and bottom for a 4:5 website image. Beautiful confident minimal composition and deep but soft shadows, not a flat stock photograph. Anatomically correct hands with five fingers each. No typography, no lettering, no watermark, no celestial clipart, no neon, no extra objects, no jewelry, no candles, no frame, no collage.
```

### Авторская книга

```text
Use case: product-mockup.
Asset type: editorial photograph for the author's book section of a premium Russian tarot and reflective-practice website, landscape 1536 × 1024.
One beautifully composed, photorealistic literary still life: a substantial closed linen-bound book lies diagonally on a creamy travertine plinth, seen from an elevated three-quarter angle. The cover is deep espresso olive-brown linen with a fine restrained antique-gold oval outline, and precisely typeset small gold Russian lettering, exactly these three lines: "КАРТА" / "КАК" / "ЗЕРКАЛО". No author name, no other words. The title must be clearly legible and correctly spelled in Cyrillic. A small freestanding oval antique-brass mirror is softly blurred in the background at the left, reflecting only a warm cream wall and light, never a person. A relaxed fold of ivory linen and the faintest dry twig shadow create texture at the far right. Sunlight streams in from upper left, crossing the cover with soft geometric shadows. Natural tactile paper edges and linen weave, medium-format magazine photography, warm ivory, muted gold, rich coffee brown, subtle film grain, luminous highlights with deep soft shadows. Refined modern luxury book campaign, quiet and understated, no fantasy effects. Composition keeps the book fully inside the center of the frame, generous breathing room, suitable for a 4:3 crop. No watermark, no logos, no ornate magic symbols, no candles, no crystals, no border, no collage.
```

### Личный дневник

```text
Use case: photorealistic-natural.
Asset type: supporting editorial photograph for the personal journal section of Polkas Tarot, landscape 1536 × 1024.
A single refined, naturally lit still-life photograph of a quiet moment of journaling. Close overhead oblique view of an open blank ivory notebook with thick uncoated paper on a dark walnut table; a woman's relaxed right hand with natural short unpainted nails holds a slender dark fountain pen just above the page, about to write. A single ivory tarot-sized card, face down with very fine antique-gold concentric oval linework and absolutely no lettering, lies to the left of the notebook. A soft ivory linen cuff, beautiful real skin texture, honest wood grain, no jewelry, no face. Warm late afternoon sunlight pours across the notebook from the left; the page is luminous against the dark rich brown wood, with elegant deep soft shadows and a small fold of tobacco silk in the upper background. Medium-format luxury editorial photography, intimate tactile naturalism, subtle film grain, restrained composition, warm paper, espresso, antique gold and soft neutral tones. Leave both pages free of writing. The hand has exactly five anatomically natural fingers and grips the pen realistically. No text anywhere, no watermark, no logos, no neon, no magical effects, no clipart, no candles, no crystals, no collage, no border.
```

## Проверка и сопровождение

`tools/test-home-dom.js` проверяет меню, клавиатурный фокус, смену темы, передачу личного вопроса, дневную практику и переходы к книге, атласу, каталогу и дневнику. Существующие проверки каталога и авторских материалов продолжают работать.

`tools/test-home-browser.js` предназначен для реального Chromium и WebKit: ширины 320, 390, 768 и 1440 px, отсутствие горизонтального переполнения, загрузка всех изображений, размеры управления, меню, книга и расклад. Он запускает локальный сервер самостоятельно и сохраняет снимки в `screenshots/home/`. Workflow «Главная — Chromium и WebKit» запускает эту проверку в PR и публикует снимки отдельным артефактом.
