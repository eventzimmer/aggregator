const { createClient, SOURCES_URL, customHeaderRequest } = require('./utils')
const { promisify } = require('util')

/**
 * Returns the latest source from redis.
 * Populates the "sources" key in redis with a new list of sources if it is empty.
 * @function
 * @return {Promise<Object>}
 */
async function currentSource () {
  const client = createClient()
  const llenAsync = promisify(client.llen).bind(client)
  const lpushAsync = promisify(client.lpush).bind(client)
  const lpopAsync = promisify(client.lpop).bind(client)

  const response = await llenAsync('sources')
  if (response === 0) {
    let sources = await customHeaderRequest({
      url: SOURCES_URL,
      json: true
    })
    await lpushAsync('sources', ...sources.map((s) => JSON.stringify(s)))
  }
  let source = await lpopAsync('sources')
  client.quit()
  return source
}

exports.currentSource = currentSource
