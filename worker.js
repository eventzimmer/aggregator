const Queue = require('bull');
const bunyan = require('bunyan')

const { createClient } = require('./src/utils')
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

logger.info(`Initializing event queue`)
const eventQueue = new Queue('events', REDIS_URL)

eventQueue.process(async(job) => {
  const client = createClient()
  const sismemberAsync = promisify(client.sismember).bind(client)
  const saddAsync = promisify(client.sadd).bind(client)
  let event = job.data

  return Promise.all([
    loadTSVFromUrl(SOURCES_URL), // Verify that event source is in sources
    loadTSVFromUrl(LOCATIONS_URL), // Verify that event location is in locations
    sismemberAsync('processed_events', event.url) // Verify has not been processed before
  ]).then((checks) => { // Check event
    if (checks[0].find((s) => s[1] === event.source) === undefined) {
      return Promise.reject(`Cannot find source ${event.source} in list of sources.`)
    } else if (checks[1].find((l) => l[0]) === undefined) {
      return Promise.reject(`Cannot find location ${event.location} in list of locations.`)
    } else if (checks[2]) {
      return Promise.reject(`Event with url ${event.url} has been processed before.`)
    } else {
      return Promise.resolve(event)
    }
  }).then((event) => { // If Facebook => get more event details

  }).then((event) => { // Add event
    return Promise.all([
        createEvents([event]),
        saddAsync('processed_events', event.url)
    ])
  }).catch((err) => {
    client.quit()
    return Promise.reject(err)
  })
})


logger.info(`Initializing sources queue.`)
const sourcesQueue = new Queue('sources', REDIS_URL)
sourcesQueue.on('error', (err) => logger.error(err))

sourcesQueue.process(async (job) => {
  return currentSource().then((source) => {
    source = JSON.parse(source)
    logger.info(`Fetching source of type ${source[0]} with URL ${source[1]}`)
    if (source[0] === 'Facebook') {
      return facebook.loadFromSource(source[1]).then((items) => facebook.transFormToEventList(items))
    } else if (source[0] === 'iCal') {
      return iCal.loadFromSource(source[1])
          .then((items) => iCal.transFormToEventList(items))
          .then((components) => Promise.all(components.map((component) => iCal.transFormToEvent(component))))
    } else {
      return Promise.reject(`Source of type ${source[0]} is currently not supported.`)
    }
  }).then((events) => {
    return Promise.all(events.map((e) => eventQueue.add(e)))
  }).catch((err) => {
    return Promise.reject(new Error(err))
  })
})

tokenQueue.add({}, { repeat: { every: 35000 * 1000 } }) // Repeat every 35000 seconds = a little less than 10 hours
sourcesQueue.add({}, { repeat: { cron: '0 9-21 * * *' }}) // Hourly during 9am and 9pm every day
