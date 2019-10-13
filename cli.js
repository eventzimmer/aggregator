const Queue = require('bull')
const REDIS_URL = (process.env.REDIS_URL !== undefined) ? process.env.REDIS_URL : 'redis://localhost:6379/1'

require('yargs') // eslint-disable-line
  .command('token', 'Requests a new access token', function (yargs) {}, async function () {
    const tokenQueue = new Queue('tokens', REDIS_URL)
    await tokenQueue.add()
    console.log('Added new job to token queue.')
    return tokenQueue.close()
  })
  .command('current', 'Requests a current source', function (yargs) {}, async function () {
    const currentSourceQueue = new Queue('current_source', REDIS_URL)
    await currentSourceQueue.add()
    console.log('Added new job to token queue.')
    return currentSourceQueue.close()
  })
  .command('source [aggregator] [url]', 'Requests a custom source', function (yargs) {
    yargs
      .positional('aggregator', {
        describe: 'The aggregation type',
        choices: ['Facebook', 'iCal', 'RSS']
      })
      .positional('url', {
        describe: 'The source url'
      })
  }, async function (argv) {
    const sourcesQueue = new Queue('sources', REDIS_URL)
    await sourcesQueue.add({
      url: argv.url,
      aggregator: argv.aggregator
    })
    console.log('Added new job to sources queue')
    return sourcesQueue.close()
  })
  .demandCommand()
  .argv
