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
            expect(events).to.have.length(128)
            done()
          }).catch((err) => {
            done(err)
          })
        }
      })
    })
  })

  describe('transFormToEvent', function () {
    it('Should properly read a feed and produce valid events', function (done) {
      fs.readFile(FEED_PATH, async function (err, data) {
        if (err) {
          done(err)
        } else {
          const eventList = await RSS.transFormToEventList(data.toString())
          const transformed = await RSS.transFormToEvent(eventList[0])
          try {
            expect(transformed.url).to.be.a('string').and.satisfy((url) => url.startsWith('http'))
            expect(transformed.name).to.be.a('string')
            expect(transformed.starts_at).to.be.a('date')
            expect(transformed.description).to.be.a('string')
            expect(transformed.location).to.be.a('string')
            done()
          } catch (err) {
            done(err)
          }
        }
      })
    })

  })
})
