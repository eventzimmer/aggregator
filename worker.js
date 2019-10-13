const Queue = require('bull')
const errors = require('request-promise-native/errors')

const processSource = require('./src/processors/sources')
const processEvent = require('./src/processors/events')
const { createClient, customHeaderRequest, LOCATIONS_URL } = require('./src/utils')
const { requestToken, createEvents, proposeEvents } = require('./src/endpoint')
const { currentSource } = require('./src/sources')
const logger = require('./src/logger')

const REDIS_URL = (process.env.REDIS_URL !== undefined) ? process.env.REDIS_URL : 'redis://localhost:6379/1'

function handleError (job, err) {
  logger.error(err)
}

logger.info(`Initializing token queue.`)
const tokenQueue = new Queue('tokens', REDIS_URL)
tokenQueue.on('failed', handleError)

tokenQueue.process(requestToken)

tokenQueue.on('completed', async function (job, result) {
  const client = createClient()
  await client.set('access_token', result)
  await client.quit()
  logger.info(`Successfully updated access token`)
})

tokenQueue.add(null, { repeat: { every: 35000 * 1000 } }) // Repeat every 35000 seconds = a little less than 10 hours

// Initialize events queue
logger.info(`Initializing events queue`)
const eventsQueue = new Queue('events', REDIS_URL)
eventsQueue.on('failed', handleError)

eventsQueue.process(processEvent)

eventsQueue.on('active', async (job) => {
  const client = createClient()
  const event = job.data

  const count = await client.sismember('processed_events', event.url)
  if (count) {
    const message = `A event with url ${event.url} and name ${event.name} exists already.`
    logger.info(message)
    await job.discard()
    await job.moveToFailed(new Error(message))
  }
  await client.quit()
})

eventsQueue.on('completed', async (job, result) => {
  let event = result
  const client = createClient()
  await client.sadd('processed_events', event.url)
  try {
    const locations = await customHeaderRequest({
      url: `${LOCATIONS_URL}?${new URLSearchParams({
        name: `eq.${event.location}`
      }).toString()}`,
      json: true
    })
    if (!locations.length) {
      logger.info(`Can't find a matching location with name ${event.location} for event ${event.url}. Adding event to proposed events.`)
      await proposeEvents([event], client)
    } else {
      await createEvents([event], client)
    }
    logger.info(`Added event with url ${event.url} and name ${event.name}`)
  } catch (err) {
    if (err instanceof errors.StatusCodeError) {
      logger.info(`Event with url ${event.url} has previously been added to the API.`)
    } else {
      logger.error(err)
    }
  } finally {
    await client.quit()
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
  const client = createClient()
  const source = await currentSource(client)
  await client.quit()
  return source
})

currentSourceQueue.on('completed', (job, result) => {
  let source = JSON.parse(result)
  sourcesQueue.add(source)
})

currentSourceQueue.add(null, {
  repeat: { cron: '*/10 0,7-21 * * *' }
}) // Every 10 minutes.
