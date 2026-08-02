# CalcuVolt

CalcuVolt is a browser-based NEC 2023 workspace for independent conductor
selection, raceway fill and ampacity adjustment, voltage-drop checks, saved
project circuits, and panel layout.

## Workflow

1. Run Conductor Sizing, Voltage Drop, or manual Raceway calculations directly;
   an empty project is valid and no circuit must exist first.
2. Use **Save as circuit** only when a calculation should become part of the
   project.
3. Use saved circuits for Panel Schedule and grouped Raceway calculations.
4. Edit, duplicate, run Voltage Drop for, or delete a saved circuit from the
   Saved Circuits section. Project changes are persisted locally and included
   in JSON export.

## Run locally

Serve the repository root with any static HTTP server. ES modules and the
service worker do not run correctly when `index.html` is opened directly with a
`file://` URL.

Example:

```sh
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Tests

The test suite uses the test runner built into Node.js 20 or newer and has no
third-party dependencies:

```sh
npm test
```

## Architecture

- `src/data/nec.js` contains the scoped NFPA 70-2023 dataset and references.
- `src/domain/` contains pure calculation functions with no DOM or storage
  dependencies.
- `src/domain/circuit-model.js` normalizes drafts and creates, updates, or
  duplicates saved circuits while keeping conductor sizing in the domain layer.
- `src/storage/project-store.js` validates, migrates, and persists projects.
- `app.js` is the browser application layer.
- `test/` contains calculation and persistence tests.

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
