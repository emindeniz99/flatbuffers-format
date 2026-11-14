# Changelog

All notable changes to `prettier-plugin-flatbuffers` are documented in
this file. This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **First published release: `0.1.0`.** This package was developed inside a
> monorepo beforehand, so notes generated from that history — including
> "breaking changes" between internal package names — describe
> pre-publication development. Nothing installed from the registry needs
> to migrate for them.

## [0.3.1](https://github.com/emindeniz99/flatbuffers-format/compare/prettier-plugin-flatbuffers-v0.3.0...prettier-plugin-flatbuffers-v0.3.1) (2026-11-14)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * flatbuffers-format bumped to 0.7.0

## [0.3.0](https://github.com/emindeniz99/flatbuffers-format/compare/prettier-plugin-flatbuffers-v0.2.0...prettier-plugin-flatbuffers-v0.3.0) (2026-11-14)


### Features

* **prettier-plugin:** add the spaceAfterAttributeColon option ([6f796cb](https://github.com/emindeniz99/flatbuffers-format/commit/6f796cbaf58db76b02c646f8b53814eecab45cfc))
* **prettier-plugin:** add the spaceAfterTypeColon option ([84026ef](https://github.com/emindeniz99/flatbuffers-format/commit/84026ef3e7984ccda0eb3718ad3bb8134d5ecb7a)), closes [#16](https://github.com/emindeniz99/flatbuffers-format/issues/16)
* **prettier-plugin:** add the style guide layout options ([b3ae14b](https://github.com/emindeniz99/flatbuffers-format/commit/b3ae14b53549038f9495bdf4fa08bafeecbb94c5)), closes [#16](https://github.com/emindeniz99/flatbuffers-format/issues/16)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * flatbuffers-format bumped to 0.6.0

## [0.2.0](https://github.com/emindeniz99/flatbuffers-format/compare/prettier-plugin-flatbuffers-v0.1.1...prettier-plugin-flatbuffers-v0.2.0) (2026-10-19)


### Features

* **prettier-plugin:** honor trailingComma, bracketSpacing, objectWrap ([4fda0f5](https://github.com/emindeniz99/flatbuffers-format/commit/4fda0f5b81cec0fcce42d8a9e23d3698d8bd2bc8))


### Bug Fixes

* **prettier-plugin:** apply a config file's endOfLine and pragma options ([6ebdf19](https://github.com/emindeniz99/flatbuffers-format/commit/6ebdf19ab938b79d58bb0310ff764b51086dbc6f))
* **prettier-plugin:** indent with one tab per level when useTabs is on ([a9128a3](https://github.com/emindeniz99/flatbuffers-format/commit/a9128a33daaf99002366e8b04137cb9373339489))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * flatbuffers-format bumped to 0.5.0

## [0.1.1](https://github.com/emindeniz99/flatbuffers-format/compare/prettier-plugin-flatbuffers-v0.1.0...prettier-plugin-flatbuffers-v0.1.1) (2026-08-07)


### Bug Fixes

* **flatbuffers:** make the family publish-ready before it graduates ([d7379d4](https://github.com/emindeniz99/flatbuffers-format/commit/d7379d4eae51c36d0dd98c44cf4f96c5b19ba137))

## [0.1.0] - 2026-08-07

- Prettier 3+ plugin for `.fbs` files
- Maps `tabWidth` / `useTabs` / `endOfLine` to flatbuffers-format options
- Delegates parse + format to `flatbuffers-format` `^0.1`

<!-- Future entries below this line are managed by release-please. -->
