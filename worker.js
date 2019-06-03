const { promisify } = require('util')

const Queue = require('bull')
const bunyan = require('bunyan')
const { StatusCodeError } = require('request-promise-native/errors')

const { createClient, loadTSVFromUrl, LOCATIONS_URL, customHeaderRequest } = require('./src/utils')
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
tokenQueue.on('error', (err) => logger.error(err))

tokenQueue.process((job) => {
  return requestToken().then(() => {
    logger.info(`Successfully updated access token`)
    return Promise.resolve(job)
  })
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
eventQueue.process((job) => {
  const client = createClient()
  const sismemberAsync = promisify(client.sismember).bind(client)
  const saddAsync = promisify(client.sadd).bind(client)
  let event = job.data
  logger.debug(event)
  logger.info(`Received event with url ${event.url}`)

  return sismemberAsync('processed_events', event.url).then((count) => { // Check if it has been processed before
    if (count) {
      let error = new Error(`A event with url ${event.url} and name ${event.name} exists already.`)
      error.code = 'ERR_DUPLICATE'
      throw error
    } else {
      return loadTSVFromUrl(LOCATIONS_URL).then((locations) => {
        locations = locations
          .filter((l) => l.length === 3)
          .filter((l) => !isNaN(l[1]) && !isNaN(l[2]))
          .map((l) => l.map((i) => i.trim()))

        let location = locations.find((l) => l[0] === event.location)
        if (location !== undefined) {
          event.location = {
            name: location[0],
            latitude: parseFloat(location[1]),
            longitude: parseFloat(location[2])
          }
          return Promise.resolve(event)
        } else {
          throw (new Error(`Can't find a matching location with name ${event.location} for event ${event.url}`))
        }
      })
    }
  }).then((event) => {
    if (event.source.aggregator === 'Facebook') {
      logger.debug(`Fetching event details for facebook event ${event.url}`)
      return facebook.loadFromSource(event.url)
        .then((archive) => facebook.transFormToEventDetails(archive))
        .then((details) => Promise.resolve({
          ...event,
          ...details
        }))
    } else if (event.source.aggregator === 'iCal') {
      return Promise.resolve(event)
    } else {
      throw (new Error('Unsupported aggregator.'))
    }
  }).then((event) => { // Add event to endpoint and processed events
    return Promise.all([
      createEvents([event]),
      saddAsync('processed_events', event.url)
    ])
      .then((results) => Promise.resolve(event))
      .catch((err) => {
        if (err instanceof StatusCodeError) {
          if (err.statusCode === 400) {
            logger.debug(err.response)
            logger.info(`Event with url ${event.url} has previously been added to the API.`)
            return Promise.resolve(event)
          } else {
            throw err
          }
        } else {
          throw err
        }
      })
  }).then((event) => {
    client.quit()
    logger.info(`Successfully processed event with url ${event.url} and name ${event.name}`)
    return Promise.resolve(job)
  })
    .catch((err) => {
      client.quit()
      if (err.code === 'ERR_DUPLICATE') {
        logger.info(err.message)
      } else {
        throw err // Generic issue
      }
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
sourcesQueue.process((job) => {
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
      throw (new Error(`Source of type ${source[0]} is currently not supported.`))
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
    throw err
  })
})

logger.info(`Initializing wakeup queue.`)
const wakeUpQueue = new Queue('wakeup', REDIS_URL)
wakeUpQueue.on('error', (err) => logger.error(err))

wakeUpQueue.process((job) => {
  return customHeaderRequest('https://eventzimmer-api.herokuapp.com/v1/locations')
})

tokenQueue.add(null, { repeat: { every: 35000 * 1000 } }) // Repeat every 35000 seconds = a little less than 10 hours
sourcesQueue.add(null, {
  repeat: { cron: '*/10 0,7-21 * * *' },
  timeout: 120000 // kill jobs after two minutes to prevent memory leaks
}) // Every 10 minutes.
wakeUpQueue.add(null, { repeat: { cron: '*/30 * * * *' } }) // Every 30 minutes
