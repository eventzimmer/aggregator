const fs = require('fs')
const process = require('process')
const path = require('path')
const expect = require('chai').expect
const RSS = require('../src/rss')

const FEED_PATH = path.join(process.cwd(), 'fixtures/feed.xml')

describe('RSS', function () {
  describe('transformToEventList', function () {
    it('Should read an RSS feed and build a list of events from it', function (done) {
      fs.readFile(FEED_PATH, function (err, data) {
        if (err) {
          done(err)
        } else {
          RSS.transFormToEventList(data.toString()).then((events) => {
            expect(events).to.have.length(127)
            done()
          }).catch((err) => {
            done(err)
          })
        }
      })
    })
  })
})
