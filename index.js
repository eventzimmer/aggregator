const process = require('process')
const bunyan = require('bunyan')

global.logger = bunyan.createLogger({
    name: '@eventzimmer/aggregator',
    level: (process.env.LOG_LEVEL !== undefined) ? process.env.LOG_LEVEL : 'debug'
})

process.on('exit', () => {
    global.logger.debug('Shutting down')
})

const argv = require('yargs') // eslint-disable-line
    .commandDir('./cmds')
    .demandCommand()
    .help()
    .strict()
    .argv
