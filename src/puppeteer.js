const process = require('process')
const puppeteer = require('puppeteer')

const GRAPHQL_URL = 'https://www.facebook.com/api/graphql/'

/**
 * Records API and SCONTENT responses
 * @param {string} url
 * @return {Promise<Array<any>>}
 */
async function recordResponses (url) {
  // list of events for converting to HAR
  let responses = []
  let args = ['--no-sandbox', '--disable-setuid-sandbox']

  if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
    let proxy = (process.env.HTTP_PROXY) ? process.env.HTTP_PROXY : process.env.HTTPS_PROXY
    args.push(`--proxy-server=${proxy}`)
  }

  const browser = await puppeteer.launch({
    args: args
  })
  const page = await browser.newPage()
  page.on('response', async (response) => {
    if (response.url() === GRAPHQL_URL) {
      let data = await response.json()
      responses.push({
        url: response.url(),
        data: data
      })
    }
  })

  await page.goto(url)
  await page.waitFor(5000)
  await browser.close()
  return responses
}

exports.recordResponses = recordResponses
