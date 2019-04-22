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
  return new Promise((resolve, reject) => {
    // list of events for converting to HAR
    let responses = []
    let args = ['--no-sandbox', '--disable-setuid-sandbox']

    if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
      let proxy = (process.env.HTTP_PROXY) ? process.env.HTTP_PROXY : process.env.HTTPS_PROXY
      args.push(`--proxy-server=${proxy}`)
    }

    puppeteer.launch({
      args: args
    }).then((browser) => {
      browser.newPage().then((page) => {
        page.on('response', (response) => {
          if (response.url() === GRAPHQL_URL) {
            response.json().then((data) => {
              responses.push({
                url: response.url(),
                data: data
              })
            }).catch((err) => {
              console.error(err)
            })
          } else if (response.url().startsWith(SCONTENT_URL)) {
            responses.push({
              url: response.url()
            })
          }
        })
        page.goto(url).then(() => {
          page.waitFor(5000).then(() => {
            browser.close().then(() => {
              console.debug(`Closed browser`)
              resolve(responses)
            }).catch((err) => {
              reject(err)
            })
          }).catch((err) => {
            reject(err)
          })
        })
      })
    }).catch((err) => {
      reject(err)
    })
  })
}

exports.recordResponses = recordResponses
