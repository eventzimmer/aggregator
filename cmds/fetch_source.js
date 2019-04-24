const { promisify } = require('util')
const { currentSource } = require('../src/sources')
const { createClient } = require('../src/utils')
const facebook = require('../src/facebook')
const iCal = require('../src/ical')

exports.command = 'fetch_source'

exports.describe = 'Fetches the latest source.'

exports.handler = function () {
  const client = createClient()
  const lpushAsync = promisify(client.lpush).bind(client)

  currentSource().then((source) => {
    source = JSON.parse(source)
    global.logger.info(`Fetching source of type ${source[0]} with URL ${source[1]}`)
    if (source[0] === 'Facebook') {
      return facebook.loadFromSource(source[1]).then((items) => facebook.transFormToEventList(items))
    } else if (source[0] === 'iCal') {
      return iCal.loadFromSource(source[1])
          .then((items) => iCal.transFormToEventList(items))
          .then((components) => Promise.all(components.map((component) => iCal.transFormToEvent(component))))
    } else {
      return Promise.reject(`Source of type ${source[0]} is currently not supported.`)
    }
  })
      .then((events) => {
        return lpushAsync('queued_events', ...events.map((e) => JSON.stringify(e)))
      })
      .then((count) => {
        global.logger.info(`Inserted ${count} events into the queue.`)
        client.quit()
      })
      .catch((err) => {
        global.logger.error(err)
        client.quit()
      })
}
