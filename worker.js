const { promisify } = require('util')

const Queue = require('bull')
const bunyan = require('bunyan')

const { createClient, LOCATIONS_URL, customHeaderRequest } = require('./src/utils')
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

tokenQueue.process(async (job) => {
  await requestToken()
  logger.info(`Successfully updated access token`)
  return job
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
eventQueue.process(async (job) => {
  const client = createClient()
  const sismemberAsync = promisify(client.sismember).bind(client)
  let event = job.data
  logger.debug(event)
  logger.info(`Received event with url ${event.url}`)

  const count = await sismemberAsync('processed_events', event.url)
  if (count) {
    throw new Error(`A event with url ${event.url} and name ${event.name} exists already.`)
  }
  const locations = await customHeaderRequest({
    url: LOCATIONS_URL,
    json: true
  })
  const location = locations.find((l) => l.name === event.location)
  if (location === undefined) {
    throw new Error(`Can't find a matching location with name ${event.location} for event ${event.url}`)
  }
  if (event.source.aggregator === 'Facebook') {
    const archive = await facebook.loadFromSource(event.url)
    const details = await facebook.transFormToEventDetails(archive)
    event = {
      ...event,
      ...details
    }
  } else if (event.source.aggregator !== 'iCal') {
    throw new Error('Unsupported aggregator.')
  }
  event.source = event.source.url
  const saddAsync = promisify(client.sadd).bind(client)
  await saddAsync('processed_events', event.url)
  client.quit()
  const response = await createEvents([event])
  if (response.status === 409) {
    throw new Error(`Event with url ${event.url} has previously been added to the API.`)
  }
  logger.info(`Successfully processed event with url ${event.url} and name ${event.name}`)
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
  let source = await currentSource()
  source = JSON.parse(source)
  logger.info(`Fetching source of type ${source.aggregator} with URL ${source.url}`)
  let events = []
  if (source.aggregator === 'Facebook') {
    let archive = await facebook.loadFromSource(source.url)
    let items = await facebook.transFormToEventList(archive)
    await Promise.all(items.map(async (item) => {
      const event = await facebook.transFormToEvent(item)
      events.push(event)
      return event
    }))
  } else if (source.aggregator === 'iCal') {
    const archive = await iCal.loadFromSource(source.url)
    let items = iCal.transFormToEventList(archive)
    await Promise.all(items.map(async (item) => {
      let event = await iCal.transFormToEvent(item)
      events.push(event)
      return event
    }))
  } else {
    throw (new Error(`Source of type ${source.aggregator} is currently not supported.`))
  }
  events.forEach((e) => {
    e.source = source
  })
  logger.debug(`Fetched ${events.length} events and added them to the queue.`)
  events.forEach((e, index) => {
    eventQueue.add(e, { delay: index * 10000 })
  })
  return job
})

tokenQueue.add(null, { repeat: { every: 35000 * 1000 } }) // Repeat every 35000 seconds = a little less than 10 hours
tokenQueue.add(null)
sourcesQueue.add(null, {
  repeat: { cron: '*/10 0,7-21 * * *' },
  timeout: 120000 // kill jobs after two minutes to prevent memory leaks
}) // Every 10 minutes.
