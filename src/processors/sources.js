const iCal = require('../ical')
const facebook = require('../facebook')
const RSS = require('../rss')
const logger = require('../logger')

module.exports = async function (job) {
  let source = job.data
  logger.info(`Fetching source of type ${source.aggregator} with URL ${source.url}`)
  let events = []
  if (source.aggregator === 'Facebook') {
    const archive = await facebook.loadFromSource(source.url)
    const items = await facebook.transFormToEventList(archive)
    events = await Promise.all((items.map((item) => facebook.transFormToEvent(item))))
  } else if (source.aggregator === 'iCal') {
    const archive = await iCal.loadFromSource(source.url)
    const items = await iCal.transFormToEventList(archive)
    events = await Promise.all(items.map((item) => iCal.transFormToEvent(item)))
  } else if (source.aggregator === 'RSS') {
    const feed = await RSS.loadFromSource(source.url)
    const items = await RSS.transFormToEventList(feed)
    events = await Promise.all(items.map((item) => RSS.transFormToEvent(item)))
  } else {
    throw (new Error(`Source of type ${source.aggregator} is currently not supported.`))
  }
  events.forEach((e) => {
    e.source = source
  })
  logger.debug(`Fetched ${events.length} events and added them to the queue.`)
  return events
}
