// Can be used to issue a new source to the worker
const Queue = require('bull')

const REDIS_URL = (process.env.REDIS_URL !== undefined) ? process.env.REDIS_URL : 'redis://localhost:6379/1'
const tokenQueue = new Queue('token', REDIS_URL)

tokenQueue.add().then(() => {
  console.log('Added new job to token queue.')
  process.exit()
})
