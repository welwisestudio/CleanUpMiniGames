# Источники и границы анализа

Комплект подготовлен 2 октября 2026 года по локальному проекту `S:\PhaserGames\ASMR Game`.

Редакция 1.1 учитывает последующие требования руководителя в текущем чате и предоставленный `EMPLOYEE-GUIDE.docx`. DOCX отредактирован напрямую; Markdown-копия синхронизирована с его содержанием. Новые правила процесса отделены от исторических фактов ASMR.

## Первичные материалы пользователя

1. `CodexChats/Chat1.txt` — основной цикл разработки, 82 верхнеуровневых блока запросов.
2. `CodexChats/Chat2.txt` — музыка, mute, затем подбор 22 SFX.
3. `CodexChats/Chat3.txt` — имена файлов/билд и устранение расхождений с настоящим YouTube.

Текст запросов сохранён в [индексе](case-study/REQUEST-INDEX.md). Встроенные изображения были исключены из текстовой выгрузки, сами чаты не изменялись. Выводы о жалобах основаны на тексте запросов/ответов, документации и коде; не заявляется визуальная экспертиза всех встроенных base64-картинок.

## Код и документы

Изучены конфигурация зависимостей, bootstrap, сцены, конфиги уровней, UI и layout, SDK, сохранения, реклама, аудио, реестры загрузки, награды, pack/build scripts и ключевые тесты. Карта исходников — в [PROJECT-ARCHITECTURE](case-study/PROJECT-ARCHITECTURE.md).

Прочитаны корневые README, BUILD-COMPRESSION, ECONOMY-BALANCE, TEST-ADS, YOUTUBE-PLAYABLES, VALIDATION и профильные VALIDATION-*. Изучены дизайн-заметки, manifests генераций и отчёты reference по premium, redesign, cleaning, dressup и ремонту невест. Перечень исходных Markdown с хешами включён в [source-audit.json](case-study/source-audit.json).

Полные локальные документы YouTube приложены в [platform/source](platform/source/README.md). Они копируются без правок. Unity-specific части сохранены как исторический источник, а рабочая JS-инструкция написана отдельно.

## Официальные технические источники

- [Phaser Scale Manager](https://docs.phaser.io/phaser/concepts/scale-manager) — режимы масштабирования; проверено при подготовке.
- [Vite Getting Started](https://vite.dev/guide/) — совместимость Node; проверено при подготовке.
- [Pillow: WebP](https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html#webp) — параметры кодирования; проверено при подготовке.
- [YouTube SDK](https://developers.google.com/youtube/gaming/playables/reference/sdk) — контракты вызовов; открыто и сверено 02.10.2026.
- [YouTube Integration requirements](https://developers.google.com/youtube/gaming/playables/certification/requirements_integration) — обязательная интеграция; открыто 02.10.2026.
- [YouTube Monetization](https://developers.google.com/youtube/gaming/playables/reference/monetization) — справка для настоящего подключения; открыто 02.10.2026.
- [YouTube Certification](https://developers.google.com/youtube/gaming/playables/certification/requirements) — отправная точка перед публикацией; открыто 02.10.2026.

Редакция 1.2: 02.10.2026 проверены страница [Background Remover](https://higgsfield.ai/apps/image-background-remover), опубликованные схемы MCP и read-only поиск/рекомендация каталога. Страница описывает PNG/JPG → прозрачный PNG без промпта. Схема каталога упоминает отдельный `remove_background`, но вызываемый инструмент в этой сессии отсутствует; поиск/рекомендация не подтвердили маршрут. Аргументы, цена и реальная обработка не проверены; генерации и вырезание не запускались. Остальные исторические model IDs не гарантируют текущую доступность. DOCX восстановлен из внешнего архива комплекта и синхронно обновлён с Markdown.

## Как различать факты

- **Подтверждено сейчас чтением кода:** число уровней/стадий, модули, SDK-граница, текущие fallback-условия, lockfile-версии, скрипт бюджета.
- **Исторический результат:** старые численные QA-прогоны, сравнения графики, длительности, успешные сборки из чатов и VALIDATION.
- **Рекомендация шаблона:** инъекция адаптера, строковые ID с первого дня, явный dev-профиль, приёмка одного образца до массового контента.
- **Требует проверки при новом релизе:** действующие лимиты платформы, реальная реклама, права/настройки аккаунта, конкретные устройства, наличие модели генерации.

Комплект не содержит копии приложения, приватных настроек `.env` или runtime-медиа. Он переносим без исходной ASMR-папки. Файлы `project/`, `src/`, `tests/` в инструкциях — план будущего проекта; AI создаёт их после старта работы.
