const { recordResponses } = require('../src/puppeteer')

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
  recordResponses(argv.url).then((responses) => {
    console.log(JSON.stringify(responses))
  }).catch((err) => {
    console.error(err)
  })
}
