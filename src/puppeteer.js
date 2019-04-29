const process = require('process')
const puppeteer = require('puppeteer')

const GRAPHQL_URL = 'https://www.facebook.com/api/graphql/'
const SCONTENT_URL = 'https://scontent'

/**
 * Records API and SCONTENT responses
 * @param {string} url
 * @return {Promise<any>}
 */
function recordResponses (url) {
  // list of events for converting to HAR
  let responses = []
  let args = ['--no-sandbox', '--disable-setuid-sandbox']

  if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
    let proxy = (process.env.HTTP_PROXY) ? process.env.HTTP_PROXY : process.env.HTTPS_PROXY
    args.push(`--proxy-server=${proxy}`)
  }

  return puppeteer.launch({
    args: args
  })
    .then((browser) => Promise.all([Promise.resolve(browser), browser.newPage()]))
    .then((values) => {
      let browser = values[0]
      let page = values[1]

      page.on('response', (response) => {
        if (response.url() === GRAPHQL_URL) {
          response.json().then((data) => {
            responses.push({
              url: response.url(),
              data: data
            })
          }).catch((err) => {
            console.debug(err) // This issue is not interesting. Failed responses will simply be ignored.
          })
        } else if (response.url().startsWith(SCONTENT_URL)) {
          responses.push({
            url: response.url()
          })
        }
      })

      return page.goto(url)
        .then(() => page.waitFor(5000))
        .then(() => browser.close())
        .then(() => Promise.resolve(responses))
    })
}

exports.recordResponses = recordResponses
