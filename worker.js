const { promisify } = require('util')

const Queue = require('bull')
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

eventQueue.process(1,async(job) => {
  const client = createClient()
  const sismemberAsync = promisify(client.sismember).bind(client)
  const saddAsync = promisify(client.sadd).bind(client)
  let event = job.data
  console.log(event)
  logger.debug(`Received event with url ${event.url}`)

  /*sismemberAsync('processed_events', event.url).then(() => { // Check if it has been processed before
    if (event.id !== undefined) {
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
    console.log(event)
    return Promise.all([
        createEvents([event]),
        saddAsync('processed_events', event.url)
    ])
  }).catch((err) => {
    console.log("HEY4?")
    client.quit()
    logger.error(err)
    return Promise.reject(err)
  })*/
})


logger.info(`Initializing sources queue.`)
const sourcesQueue = new Queue('sources', REDIS_URL)

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
          .then((archive) => iCal.transFormToEventList(archive))
          .then((components) => Promise.all(components.map((component) => iCal.transFormToEvent(component))))
      ])
    } else {
      return Promise.reject(`Source of type ${source[0]} is currently not supported.`)
    }
  }).then((results) => {
    console.log(results)
    let source = { aggregator: results[0][0], url: results[0][1] }
    let events = results[1].map((e) => {
      e.source = source
      return e
    })
    logger.debug(`Fetched ${events.length} events and added them to the queue.`)
    return Promise.resolve(events.map((e) => eventQueue.add(e)))
  }).catch((err) => {
    logger.error(err)
    return Promise.reject(new Error(err))
  })
})

tokenQueue.add({}, { repeat: { every: 35000 * 1000 } }) // Repeat every 35000 seconds = a little less than 10 hours
//sourcesQueue.add({}, { repeat: { cron: '0 9-21 * * *' }}) // Hourly during 9am and 9pm every day
sourcesQueue.add({})
