const facebook = require('../facebook')
const logger = require('../logger')
const { customHeaderRequest, LOCATIONS_URL } = require('../utils')

module.exports = async function (job) {
  let event = job.data
  logger.debug(event)
  logger.info(`Received event with url ${event.url}`)

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
  return event
}

/**
 * Adding a new event is done in 4 stages
 * - 1) check if event URL has previously been processed
 * - 2) (check if location is valid)
 * - 3) if aggregated via Facebook => retrieve details
 * - 4) post to endpoint
 * - 4) add to list of processed events
 */
