const readline = require('readline')
const process = require('process')
const { createEvents } = require('../src/endpoint')

exports.command = 'create_events'

exports.describe = 'Creates events from a JSON object.'

exports.handler = function () {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  let lines = []
  rl.on('line', (input) => lines.push(input))
  rl.on('close', () => {
    try {
      let events = JSON.parse(lines.join('\n'))
      createEvents(events).then((body) => {
        global.logger.debug(body)
        global.logger.info(`Successfully created ${events.length} events.`)
      }).catch((err) => global.logger.error(err))
    } catch (err) {
      global.logger.error(err)
    }
  })
}
