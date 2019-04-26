const { promisify } = require('util')

const Queue = require('bull')
const bunyan = require('bunyan')

const { createClient, loadTSVFromUrl, LOCATIONS_URL } = require('./src/utils')
const { requestToken, createEvents } = require('./src/endpoint')
const { currentSource } = require('./src/sources')
const facebook = require('./src/facebook')
const iCal = require('./src/ical')

const REDIS_URL = (process.env.REDIS_URL !== undefined) ? process.env.REDIS_URL : 'redis://localhost:6379/1'

// Initialize logging
let logger = bunyan.createLogger({
  name: '@eventzimmer/aggregator',
  level: (process.env.LOG_LEVEL !== undefined) ? process.env.LOG_LEVEL : 'debug'
})

// Initialize access token queue
logger.info(`Initializing access token queue.`)
const tokenQueue = new Queue('access_tokens', REDIS_URL)

tokenQueue.on('completed', (job, result) => logger.info(`Successfully updated access token`))
tokenQueue.on('error', (err) => logger.error(err))

tokenQueue.process(async (job) => {
  return requestToken()
})

logger.info(`Initializing events queue`)
const eventQueue = new Queue('events', REDIS_URL)
eventQueue.on('error', (err) => logger.error(err))

/**
 * Adding a new event is done in 4 stages
 * - 1) check if event URL has previously been processed
 * - 2) (check if location is valid)
 * - 3) if aggregated via Facebook => retrieve details
 * - 4) post to endpoint
 * - 4) add to list of processed events
 */
eventQueue.process(1, async (job) => {
  const client = createClient()
  const sismemberAsync = promisify(client.sismember).bind(client)
  const saddAsync = promisify(client.sadd).bind(client)
  let event = job.data
  logger.debug(event)
  logger.info(`Received event with url ${event.url}`)

  sismemberAsync('processed_events', event.url).then((count) => { // Check if it has been processed before
    if (count) {
      logger.debug(count)
      return Promise.reject(new Error(`A event with url ${event.url} exists already.`))
    } else {
      return loadTSVFromUrl(LOCATIONS_URL).then((locations) => {
        let location = locations.find((l) => l[0] === event.location)
        if (location !== undefined) {
          event.location = {
            name: location[0],
            latitude: parseFloat(location[1]),
            longitude: parseFloat(location[2])
          }
          return Promise.resolve(event)
        } else {
          return Promise.reject(new Error(`Can't find a matching location with name ${event.location} for event ${event.url}`))
        }
      })
    }
  }).then((event) => {
    if (event.city !== undefined) { // NOTE: DO NOT REMOVE FACEBOOK'S CITY ATTRIBUTE UNLESS YOU PLAN TO ADD SOMETHING ELSE TO DIFFERENTIATE BETWEEN OTHER AGGREGATOR'S
      logger.debug(`Fetching event details for facebook event ${event.url}`)
      return facebook.loadFromSource(event.url)
        .then((archive) => facebook.transFormToEventDetails(archive))
        .then((details) => Promise.resolve({
          ...event,
          ...details
        }))
    } else {
      return Promise.resolve(event)
    }
  }).then((event) => { // Add event to endpoint and processed events
    return createEvents([event])
      .then(saddAsync('processed_events', event.url))
      .then((count) => {
        client.quit()
        return Promise.resolve(count)
      })
  }).catch((err) => {
    client.quit()
    logger.error(err)
    return Promise.reject(err)
  })
})

logger.info(`Initializing sources queue.`)
const sourcesQueue = new Queue('sources', REDIS_URL)
sourcesQueue.on('error', (err) => logger.error(err))

/**
 * Fetching a source is done in 3 stages
 * 1) Fetching current source from sources key
 * 2) Use the current source and fetch info from iCal or Facebook
 * 3) Populate events with source info and add them (with increasing delay) to the events queue
 */
sourcesQueue.process(async (job) => {
  return currentSource().then((source) => {
    source = JSON.parse(source)
    logger.info(`Fetching source of type ${source[0]} with URL ${source[1]}`)
    if (source[0] === 'Facebook') {
      return Promise.all([
        Promise.resolve(source),
        facebook.loadFromSource(source[1])
          .then((archive) => facebook.transFormToEventList(archive))
          .then((items) => Promise.all(items.map((item) => facebook.transFormToEvent(item))))
      ])
    } else if (source[0] === 'iCal') {
      return Promise.all([
        Promise.resolve(source),
        iCal.loadFromSource(source[1])
          .then((archive) => {
            return iCal.transFormToEventList(archive)
          })
          .then((components) => Promise.all(components.map((component) => iCal.transFormToEvent(component))))
      ])
    } else {
      return Promise.reject(new Error(`Source of type ${source[0]} is currently not supported.`))
    }
  }).then((results) => {
    let source = { aggregator: results[0][0], url: results[0][1] }
    let events = results[1].map((e) => {
      e.source = source
      return e
    })
    logger.debug(`Fetched ${events.length} events and added them to the queue.`)
    return Promise.resolve(events.map((e, index) => eventQueue.add(e, { delay: index * 10000 })))
  }).catch((err) => {
    logger.error(err)
    return Promise.reject(new Error(err))
  })
})

tokenQueue.add({}, { repeat: { every: 35000 * 1000 } }) // Repeat every 35000 seconds = a little less than 10 hours
// sourcesQueue.add({}, { repeat: { cron: '0 9-22 * * *' }}) // Hourly during 9am and 9pm every day
sourcesQueue.add({}, { repeat: { cron: '*/15 0,9-23 * * *' } }) // Every 15 minutes. Scheduled for debugging.
