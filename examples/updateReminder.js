const Cloud = require('../')
const uuid = require('uuid/v1')
const {
  APPLE_ID,
  APPLE_PASSWORD
} = process.env

const cloud = new Cloud({ appleId: APPLE_ID, password: APPLE_PASSWORD })
const guid = uuid()

const reminder = {
  guid,
  title: 'This recent reminder will be updated to complete soon',
  description: 'My most recent reminder'
}

async function main () {
  const reminders = await cloud.createReminder(reminder)
  const createdReminder = reminders.find(r => r.guid === guid)

  try {
    const data = await cloud.updateReminder({
      ...createdReminder,
      completedDate: Cloud.formatICloudDate(new Date())
    })
    console.log(data)
  } catch (error) {
    console.error(error)
  }
}
main().catch(console.error)
