const { promisify } = require('util')
const Queue = require('bull')
const errors = require('request-promise-native/errors')

const processSource = require('./src/processors/sources')
const processEvent = require('./src/processors/events')
const { createClient } = require('./src/utils')
const { requestToken, createEvents } = require('./src/endpoint')
const { currentSource } = require('./src/sources')
const logger = require('./src/logger')

const REDIS_URL = (process.env.REDIS_URL !== undefined) ? process.env.REDIS_URL : 'redis://localhost:6379/1'
const client = createClient()

function handleError (job, err) {
  logger.error(err)
}

logger.info(`Initializing token queue.`)
const tokenQueue = new Queue('tokens', REDIS_URL)
tokenQueue.on('failed', handleError)

tokenQueue.process(requestToken)

tokenQueue.on('completed', async function (job, result) {
  const setAsync = promisify(client.set).bind(client)
  await setAsync('access_token', result)
  logger.info(`Successfully updated access token`)
})

tokenQueue.add({ repeat: { every: 35000 * 1000 } }) // Repeat every 35000 seconds = a little less than 10 hours

// Initialize events queue
logger.info(`Initializing events queue`)
const eventsQueue = new Queue('events', REDIS_URL)
eventsQueue.on('failed', handleError)

eventsQueue.process(processEvent)

eventsQueue.on('active', async (job, jobPromise) => {
  const sismemberAsync = promisify(client.sismember).bind(client)
  let event = job.data

  const count = await sismemberAsync('processed_events', event.url)
  if (count) {
    logger.debug(`A event with url ${event.url} and name ${event.name} exists already.`)
    jobPromise.cancel()
  }
})

eventsQueue.on('completed', async (job, result) => {
  let event = result
  const saddAsync = promisify(client.sadd).bind(client)
  await saddAsync('processed_events', event.url)
  try {
    await createEvents([event], client)
    logger.info(`Added event with url ${event.url} and name ${event.name}`)
  } catch (err) {
    if (err instanceof errors.StatusCodeError) {
      logger.info(`Event with url ${event.url} has previously been added to the API.`)
    } else {
      logger.error(err)
    }
  }
})

// Initialize sources queue
logger.info(`Initializing sources queue.`)
const sourcesQueue = new Queue('sources', REDIS_URL)
sourcesQueue.on('failed', handleError)

sourcesQueue.process(processSource)

sourcesQueue.on('completed', (job, result) => {
  result.forEach((event, index) => {
    eventsQueue.add(event, {
      delay: (5000 * index)
    })
  })
})

// Initialize current source queue
logger.info(`Initializing current_source queue`)
const currentSourceQueue = new Queue('current_source', REDIS_URL)
currentSourceQueue.on('failed', handleError)

currentSourceQueue.process(async () => {
  return currentSource(client)
})

currentSourceQueue.on('completed', (job, result) => {
  let source = JSON.parse(result)
  sourcesQueue.add(source)
})

currentSourceQueue.add({
  repeat: { cron: '*/10 0,7-21 * * *' }
}) // Every 10 minutes.

process.on('SIGTERM', () => {
  client.quit()
  logger.info(`Cleaning up redis connection.`)
})
