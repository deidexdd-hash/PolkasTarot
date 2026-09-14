# Polkas Tarot · внутренние разделы

Премиальный стиль главной распространён на каталог и руководства раскладов, атлас и окно карты, книгу и главы, авторские материалы, обучение, тренажёр, сравнение, статистику, свою колоду, расклад, карту дня, практику «Зеркало» и дневник.

## Общая система

Светлая бумага `#f5f1e8`, кофейный текст `#302c24`, бронза `#76603d`, оливковые основные кнопки `#343629`. Палитра едина и при тёмной теме устройства. Шапка браузера остаётся светлой после переходов. `css/editorial.css` загружается после прежних стилей и задаёт общие поля, кнопки, поверхности, типографику и мобильные размеры.

`js/editorial.js` оформляет результаты существующих методов рендеринга: переносит заголовок в общий блок с фотографией, добавляет миниатюры и активный раздел. Существующие узлы заголовков, обработчики действий и механизмы сохранения продолжают использоваться. Общая тема не зависит от отдельного CSS-класса главной.

Большие фото открывают основные разделы. На экранах чтения, тренажёра и форм используются компактные изображения. В обучении у направлений появились обложки, в авторских списках — реальные иллюстрации карт и пар, в каталоге — миниатюры точных схем из действующей конфигурации. Генерированные фотографии служат оформлением и не заменяют изображения рабочей колоды.

Дневник открывается отдельным экраном. Он использует тот же список записей, поиск, экспорт и импорт. Миниатюры берутся из действующей колоды. Возвращение к записи не создаёт её копию.

## Фото

Четыре изображения созданы отдельными запросами **встроенного imagegen**, режим generate. Вместе с тремя фотографиями главной сайт использует семь фотографий. У каждой — два WebP-размера, `srcset`, размеры и альтернативное описание. Обложки списков загружаются лениво. Новые мобильные файлы вместе весят около 118 КиБ.

Каталог конечных файлов: `/workspace/scratch/b277f05d53da/PolkasTarot-book/img/editorial/`.

| Фото | Мобильный файл | Большой файл |
| --- | --- | --- |
| reading-table | [reading-table-640.webp](../img/editorial/reading-table-640.webp) | [reading-table-1280.webp](../img/editorial/reading-table-1280.webp) |
| atlas-symbols | [atlas-symbols-640.webp](../img/editorial/atlas-symbols-640.webp) | [atlas-symbols-1280.webp](../img/editorial/atlas-symbols-1280.webp) |
| study-pages | [study-pages-640.webp](../img/editorial/study-pages-640.webp) | [study-pages-1280.webp](../img/editorial/study-pages-1280.webp) |
| morning-pause | [morning-pause-640.webp](../img/editorial/morning-pause-640.webp) | [morning-pause-1280.webp](../img/editorial/morning-pause-1280.webp) |

Оригиналы генерации сохранены отдельно и не перезаписывались. Преобразование в WebP выполнено с сохранением пропорций; кадрирование управляется CSS.

## Проверки

`tools/test-editorial-dom.js` проверяет разделы, элементы управления, миниатюры, сохранение заметок, повторное открытие дневника и сохранение карты дня. Прежние проверки главной, авторских материалов и каталога остаются в общем прогоне.

`tools/test-editorial-browser.js` проверяет 22 внутренних экрана в Chromium и WebKit на ширинах 320, 390, 768 и 1440 px, с тёмной темой ОС: фактический светлый фон, загрузку фото, видимость основных кнопок, размер текста полей и отсутствие горизонтального переполнения. Снимки сохраняются в `screenshots/interiors/`; workflow «Главная и разделы — Chromium и WebKit» запускает обе браузерные проверки. Это проверка браузерных движков, а не физического iPhone.

## Полный набор промптов

### reading-table

```text
Use case: photorealistic-natural. Asset type: landscape editorial photograph, 1536 × 1024, for an interior page of Polkas Tarot. A cohesive luxury literary magazine aesthetic: warm ivory, muted antique brass, espresso brown and soft olive shadows; natural afternoon window light, tactile linen, stone and paper, restrained composition, realistic film grain, deep soft shadows. This is a real-looking photograph, not a painting or UI mockup. No lettering, logos, watermark, collage, crystals, fantasy effects or cheap mystical clipart. Keep the main objects within the central 70% so the photo can be cropped to a wide banner or mobile 3:2. Subject: a quiet tarot reading table, seen from above at a gentle oblique angle. Five face-down ivory cards with exquisite thin antique-gold concentric oval lines are arranged loosely on a dark tobacco silk cloth over warm travertine. At the far edge, a relaxed female hand with natural short nails is just releasing a card, ivory linen sleeve. All fingers are anatomically correct. A brass oval mirror catches a soft reflection of the window light, never a person. Cards are the clear focal point, generous breathing room, understated editorial still life. No readable card faces or diagrams.
```

### atlas-symbols

```text
Use case: photorealistic-natural. Asset type: landscape editorial photograph, 1536 × 1024, for an interior page of Polkas Tarot. A cohesive luxury literary magazine aesthetic: warm ivory, muted antique brass, espresso brown and soft olive shadows; natural afternoon window light, tactile linen, stone and paper, restrained composition, realistic film grain, deep soft shadows. This is a real-looking photograph, not a painting or UI mockup. No lettering, logos, watermark, collage, crystals, fantasy effects or cheap mystical clipart. Keep the main objects within the central 70% so the photo can be cropped to a wide banner or mobile 3:2. Subject: a refined still life about looking closely at symbols. On a pale travertine shelf, a small antique brass magnifying glass rests across a face-down ivory tarot-sized card with delicate concentric oval gold lines. Beside it: one simple brass cup, one olive branch and a smooth river stone; a second card lies slightly underneath. Sunlight creates a precise long shadow of the olive leaves against a warm ivory wall. Close-up medium-format photograph, a thoughtful curated composition with visual depth, natural worn surfaces, no people and no text.
```

### study-pages

```text
Use case: photorealistic-natural. Asset type: landscape editorial photograph, 1536 × 1024, for an interior page of Polkas Tarot. A cohesive luxury literary magazine aesthetic: warm ivory, muted antique brass, espresso brown and soft olive shadows; natural afternoon window light, tactile linen, stone and paper, restrained composition, realistic film grain, deep soft shadows. This is a real-looking photograph, not a painting or UI mockup. No lettering, logos, watermark, collage, crystals, fantasy effects or cheap mystical clipart. Keep the main objects within the central 70% so the photo can be cropped to a wide banner or mobile 3:2. Subject: the hands of a woman studying at a sunlit walnut desk, seen from a gently elevated side angle. An open thick ivory book with blank textured pages, a slender dark pencil lightly held in her right hand, a closed dark espresso linen notebook, and two face-down cream tarot-sized cards with fine gold oval linework. Soft ivory linen sleeves, real skin texture and anatomically correct hands. A broad window shadow falls across the desk. Beautiful calm editorial photography about learning and attention; pages contain absolutely no words, no printed or handwritten symbols.
```

### morning-pause

```text
Use case: photorealistic-natural. Asset type: landscape editorial photograph, 1536 × 1024, for an interior page of Polkas Tarot. A cohesive luxury literary magazine aesthetic: warm ivory, muted antique brass, espresso brown and soft olive shadows; natural afternoon window light, tactile linen, stone and paper, restrained composition, realistic film grain, deep soft shadows. This is a real-looking photograph, not a painting or UI mockup. No lettering, logos, watermark, collage, crystals, fantasy effects or cheap mystical clipart. Keep the main objects within the central 70% so the photo can be cropped to a wide banner or mobile 3:2. Subject: a quiet morning practice beside an open window. A single face-down ivory tarot-sized card with fine antique-gold concentric oval lines rests on a folded cream linen napkin on a warm pale stone table. An elegant small ceramic cup of tea, a tiny olive twig, and the soft shadow of a sheer linen curtain complete the composition. Warm low sunlight, luminously textured paper, tactile matte ceramic and gentle steam. No people. Main card large and centered enough to read as the focal object. Peaceful intimate editorial photography, not a stock spa scene.
```
