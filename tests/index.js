const { test } = require('tap')
const nock = require('nock')

const Cloud = require('../')

// common data
const appleId = 'test@example.com'
const password = 'MySecurePassword123!'
const dsInfo = {
  dsid: 'testing123',
  firstName: 'Test',
  lastName: 'Person'
}
const webservices = {
  reminders: {
    url: 'https://reminders.icloud.com'
  }
}
const testReminders = [{
  title: 'Complete writing tests'
}]
const newReminder = {
  title: 'Create a new reminder to complete this library'
}

test('Requires options argument to create instance', (t) => {
  t.plan(1)

  t.throws(() => new Cloud())
})

test('Cloud constructor takes appleId, password options', (t) => {
  t.plan(2)

  const cloud = new Cloud({ appleId, password })

  t.equals(cloud.appleId, appleId, 'sets appleId on instance')
  t.equals(cloud.password, password, 'sets password on instance')
})

test('#login', async (t) => {
  t.plan(3)

  nock('https://setup.icloud.com')
    .post('/setup/ws/1/accountLogin', (body) => body.apple_id && body.password)
    .reply(200, {
      dsInfo,
      webservices
    }, {
      'Set-Cookie': 'Secure, HttpOnly,'
    })

  const cloud = new Cloud({ appleId, password })

  const user = await cloud.login()

  t.deepEquals(user, dsInfo, 'returns user data')
  t.deepEquals(cloud.user, user, 'user data set on instance')
  t.deepEquals(cloud.services, webservices, 'icloud services list set on instance')
})

test('#login - throws an error is response status is not 200', async (t) => {
  t.plan(1)

  nock('https://setup.icloud.com')
    .post('/setup/ws/1/accountLogin', (body) => body.apple_id && body.password)
    .reply(404, 'User not found')

  const cloud = new Cloud({ appleId, password })

  t.rejects(cloud.login, 'Response 404 - User not found')
})

test('#reminders - login if no user data', async (t) => {
  t.plan(2)

  const cloud = new Cloud({ appleId, password })

  cloud.login = async () => {
    t.pass('login was called')

    cloud.user = dsInfo
    cloud.services = webservices

    nock(webservices.reminders.url)
      .get(`/rd/startup?${cloud.params()}`)
      .reply(200, { Reminders: testReminders })
  }

  const { reminders } = await cloud.reminders()

  t.deepEquals(reminders, testReminders, 'returns reminder data')
})

test('#reminders - do not login if user data, returns reminder data', async (t) => {
  t.plan(1)

  const cloud = new Cloud({ appleId, password })

  cloud.user = dsInfo
  cloud.services = webservices
  cloud.login = async () => t.fail('login was called')

  nock(webservices.reminders.url)
    .get(`/rd/startup?${cloud.params()}`)
    .reply(200, { Reminders: testReminders })

  const { reminders } = await cloud.reminders()

  t.deepEquals(reminders, testReminders, 'returns reminder data')
})

test('#reminders - throw error if reminders are not supported', async (t) => {
  t.plan(1)

  const cloud = new Cloud({ appleId, password })

  cloud.user = dsInfo
  cloud.services = {}

  t.rejects(cloud.reminders, 'This iCloud account does not support reminders')
})

test('#createReminder', async (t) => {
  t.plan(1)

  const updatedReminders = testReminders.concat({
    ...newReminder,
    pGuid: 'tasks'
  })
  const cloud = new Cloud({ appleId, password })

  cloud.user = dsInfo
  cloud.services = webservices

  nock(webservices.reminders.url)
    .post(`/rd/reminders/tasks?${cloud.params()}`)
    .reply(200, {
      ChangeSet: {
        inserts: {
          Reminders: updatedReminders
        }
      }
    })

  const reminders = await cloud.createReminder(newReminder)

  t.deepEquals(reminders, updatedReminders, 'returns latest reminders data')
})
