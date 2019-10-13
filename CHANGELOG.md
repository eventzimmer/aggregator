# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- Added proposeEvents workflow
- Added yargs based command line

### Changed
- Use staging authentication by default
- Moved from Travis to GitHub actions
- Slugify iCalendar events if no URL is found
- Use async-redis to get rid of promisify code
- Use a fresh redis connection on every access and close once finished
- Use vertical filtering to find location
- Do not process or POST images any longer
- Refactor logic to use async/await and properly use bull queues

## [0.0.3] - 2019-06-12
### Added
- Add currentSource script for testing purposes
- Wake up API every 30 minutes
- Added docker-compose setup
- Added documentation about environment variables

### Changed
- Change default API endpoint
- Change schedule -2h to fit Ireland location
- Make facebook transform more robust

### Remove 
- Remove wakeup queue
- Removed Sentry because of privacy concerns
- Removed parseFromTSV method and replace with JSON list of sources and locations

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
