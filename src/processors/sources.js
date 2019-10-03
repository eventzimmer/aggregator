const iCal = require('../ical')
const facebook = require('../facebook')
const logger = require('../logger')

module.exports = async function (job) {
  let source = job.data
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
  return events
}
