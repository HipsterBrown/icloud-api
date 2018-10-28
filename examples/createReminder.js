const Cloud = require('../')
const {
  APPLE_ID,
  APPLE_PASSWORD
} = process.env

const cloud = new Cloud({ appleId: APPLE_ID, password: APPLE_PASSWORD })

// minimum object needed is a 'title' property
// 'guid' will be created automatically if not provided
// 'pGuid' (the guid of the Collection) will default to 'tasks' if not provided
const reminder = {
  title: 'This is an example reminder from my node module'
}

cloud.createReminder(reminder)
  .then(data => console.log(JSON.stringify(data)))
  .catch(console.error)
