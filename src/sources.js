const { createClient, loadTSVFromUrl, SOURCES_URL } = require('./utils')
const { promisify } = require('util')

/**
 * Returns the latest source from redis.
 * Populates the "sources" key in redis with a new list of sources if it is empty.
 * @function
 * @return {Promise<Object>}
 */
function currentSource () {
  return new Promise((resolve, reject) => {
    const client = createClient()
    const llenAsync = promisify(client.llen).bind(client)
    const lpushAsync = promisify(client.lpush).bind(client)
    const lpopAsync = promisify(client.lpop).bind(client)

    llenAsync('sources').then((response) => {
      if (response === 0) {
        return loadTSVFromUrl(SOURCES_URL).then((sources) => lpushAsync('sources', ...sources.map((s) => JSON.stringify(s))))
      } else {
        return Promise.resolve()
      }
    }).then(() => {
      return lpopAsync('sources')
    }).then((source) => {
      client.quit()
      resolve(source)
    }).catch((err) => {
      client.quit()
      reject(err)
    })
  })
}

exports.currentSource = currentSource
