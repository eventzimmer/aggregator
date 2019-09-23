// Can be used to issue a new source to the worker
const Queue = require('bull')

const REDIS_URL = (process.env.REDIS_URL !== undefined) ? process.env.REDIS_URL : 'redis://localhost:6379/1'
const sourcesQueue = new Queue('sources', REDIS_URL)

sourcesQueue.add(null).then(() => {
  console.log('Added new job to sources queue.')
  process.exit()
})
