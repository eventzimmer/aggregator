# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Changed
- Change schedule -2h to fit Ireland location
- Make facebook transform more robust

### Remove 
- Removed Sentry because of privacy concerns

## [0.0.2] - 2019-04-29
### Added
- Use Google drive for locations and sources
- Use sentry.io error reporting
- Added Google calendar processing

### Changed
- Use trimmed sources and locations
- Properly handle duplicate events
- Properly handle 400 status from API
- Remove obsolete console statements

## [0.0.1] - 2019-04-27
### Added
- Add Facebook and iCal aggregation
- Add caching of URLs via Redis
- Add queue system via bull
- Load list of sources from GitHub periodically as a bull job
- Added Travis
- Deployed via Heroku
