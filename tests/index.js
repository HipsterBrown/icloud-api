const { test } = require('tap')
const Cloud = require('../')

// common data
const appleId = 'test@example.com'
const password = 'MySecurePassword123!'

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
  t.plan(2)

  const cloud = new Cloud({ appleId, password })

  const user = await cloud.login()

  t.deepEquals(user, {}, 'returns user data')
  t.deepEquals(cloud.user, user, 'user data set on instance')
})

test('#reminders - login if no user data', async (t) => {
  t.plan(1)

  const cloud = new Cloud({ appleId, password })

  cloud.login = async () => t.pass('login was called')

  await cloud.reminders()
})

test('#reminders - do not login if user data, returns reminder data', async (t) => {
  t.plan(1)

  const cloud = new Cloud({ appleId, password })

  cloud.user = { username: 'Test' }
  cloud.login = async () => t.fail('login was called')

  const reminders = await cloud.reminders()

  t.deepEquals(reminders, [], 'returns reminder data')
})
