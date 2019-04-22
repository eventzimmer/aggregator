const puppeteer = require('../src/puppeteer')

exports.command = 'create_archive <url>'

exports.describe = 'Creates an archive of image and API requests'

exports.builder = {
  url: {
    alias: 'u',
    demandOption: true,
    type: String
  }
}

exports.handler = function (argv) {
  puppeteer.recordResponses(argv.url).then((responses) => {
    console.log(JSON.stringify(responses))
    process.exit()
  }).catch((err) => {
    console.error(err)
    process.exit()
  })
}
