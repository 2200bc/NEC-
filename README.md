# CalcuVolt

CalcuVolt — браузерный набор калькуляторов NEC 2023 для подбора проводника,
Derating, заполнения труб, проверки падения напряжения, сохранения цепей проекта
и раскладки панели.

## Порядок работы

1. Выберите запланированный номинал автомата и получите нужный проводник. Знать
   фактическую нагрузку на этом этапе не требуется.
2. Сохраните результат как цепь, если он должен войти в проект.
3. Когда фактический ток станет известен, укажите его отдельно в расчёте
   падения напряжения или Derating. Номинал автомата вместо нагрузки не
   подставляется.
4. Используйте сохранённые цепи для раскладки панели и групповых расчётов.
   Цепи можно редактировать, дублировать и удалять.

## Локальный запуск

Запускайте корень репозитория через любой статический HTTP-сервер. ES-модули и
Service Worker не работают корректно при открытии `index.html` через `file://`.

Example:

```sh
python -m http.server 8000
```

Затем откройте `http://localhost:8000`.

## Тесты

Тесты используют встроенный test runner Node.js 20 или новее и не требуют
сторонних зависимостей:

```sh
npm test
```

## Архитектура

- `src/data/nec.js` содержит используемые таблицы и ссылки NFPA 70-2023.
- `src/domain/` содержит чистые расчётные функции без зависимости от DOM и
  хранилища.
- `src/domain/circuit-model.js` нормализует данные и создаёт, обновляет или
  дублирует сохранённые цепи.
- `src/storage/project-store.js` проверяет, мигрирует и сохраняет проекты.
- `app.js` отвечает за интерфейс браузера.
- `test/` содержит расчётные тесты и тесты хранения.

Each project has one panel configuration: NYC single-phase network 120/208 V,
split-phase 120/240 V, or three-phase Wye 120/208 V. Circuits inherit that
context at calculation time instead of storing
their own supply-system setting. A three-pole circuit is rejected by split-phase
panel layout. The circuit model records only a current-carrying neutral; a
separate non-current-carrying neutral flag is intentionally not represented.

## NEC 2023 scope

The application implements the portions of NFPA 70-2023 needed by its current
calculators: Table 310.16, 310.15(B)(1)(1), 310.15(C)(1), user-declared neutral
treatment under 310.15(E), terminal temperature under 110.14(C), continuous
loads under 210.19/210.20/215.2, small-conductor limits under 240.4(D), and the
Chapter 9 raceway-fill method.

This is scoped calculation support, not certification of an installation.
Equipment-specific articles, demand calculations, conductor paralleling,
dwelling service allowances, fault current, interrupting ratings, grounding
and bonding sizing, local amendments, and AHJ decisions remain outside the
current model.

See [docs/nec-2023-scope.md](docs/nec-2023-scope.md) for the compliance matrix,
required user declarations, official NFPA references, and explicit exclusions.
