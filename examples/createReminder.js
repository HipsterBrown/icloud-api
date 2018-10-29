const Cloud = require('../')
const {
  APPLE_ID,
  APPLE_PASSWORD
} = process.env

const cloud = new Cloud({ appleId: APPLE_ID, password: APPLE_PASSWORD })

const date = new Date()
date.setDate(date.getDate() + 1)

// minimum object needed is a 'title' property
// 'guid' will be created automatically if not provided
// 'pGuid' (the guid of the Collection) will default to 'tasks' if not provided
const reminder = {
  title: 'This is an example reminder from my node module',
  dueDate: Cloud.formatICloudDate(date),
  dueDateIsAllDay: true
}

cloud.createReminder(reminder)
  .then(data => console.log(JSON.stringify(data)))
  .catch(console.error)
