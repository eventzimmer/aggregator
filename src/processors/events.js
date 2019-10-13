const facebook = require('../facebook')
const logger = require('../logger')

module.exports = async function (job) {
  let event = job.data
  logger.debug(event)
  logger.info(`Received event with url ${event.url}`)

  if (event.source.aggregator === 'Facebook') {
    const archive = await facebook.loadFromSource(event.url)
    const details = await facebook.transFormToEventDetails(archive)
    event = {
      ...event,
      ...details
    }
  } else if (!['iCal', 'RSS'].includes(event.source.aggregator)) {
    throw new Error(`Unsupported aggregator ${event.source.aggregator}.`)
  }
  event.source = event.source.url
  return event
}
