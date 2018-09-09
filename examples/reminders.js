const Cloud = require('../')
const {
  APPLE_ID,
  APPLE_PASSWORD
} = process.env

const cloud = new Cloud({ appleId: APPLE_ID, password: APPLE_PASSWORD })

cloud.reminders()
  .then(console.log)
  .catch(console.error)
