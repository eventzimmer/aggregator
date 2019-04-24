const fs = require('fs')
const process = require('process')
const path = require('path')
const expect = require('chai').expect
const iCal = require('../src/ical')

const FIXTURE_PATH = path.join(process.cwd(), 'fixtures/epplehaus-a6700e35263.ics')

describe('iCal', function () {
  describe('loadFromSource', function () {
    // Since this is basically testing core requests functionality it's quite stupid
  })

  describe('transformToEventList', function () {
    it('Should read an iCal and build a list of events from it', function (done) {
      fs.readFile(FIXTURE_PATH, function (err, data) {
        if (err) {
          done(err)
        }

        iCal.transFormToEventList(data.toString()).then((events) => {
          expect(events).to.have.length(10)
          done()
        }).catch((err) => {
          done(err)
        })
      })
    })
  })

  describe('transformToEvent', function () {
    it('Should transfer a single vevent to a valid event object', function (done) {
      fs.readFile(FIXTURE_PATH, (err, data) => {
        if (err) {
          done(err)
        }

        iCal.transFormToEventList(data.toString()).then((events) => {
          iCal.transFormToEvent(events[0]).then((event) => {
            expect(event.name).to.be.a('string')
            expect(event.description).to.be.a('string')
            expect(event.url).to.be.a('string')
            expect(event.starts_at).to.be.a('date')
            expect(event.location).to.be.a('string')
            // expect(event.images).to.be.a('string')
            done()
          }).catch((err) => {
            done(err)
          })
        }).catch((err) => {
          done(err)
        })
      })
    })
  })
})
