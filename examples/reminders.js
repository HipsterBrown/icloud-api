const Cloud = require('../')
const {
  APPLE_ID,
  APPLE_PASSWORD
} = process.env

const cloud = new Cloud({ appleId: APPLE_ID, password: APPLE_PASSWORD })

/*
  Should return with JSON data like:

  {
    reminders: [{
      guid,
      pGuid,
      etag,
      lastModifiedDate,
      createdDate,
      createdDateExtended,
      priority,
      completedDate,
      order,
      title,
      description,
      dueDate,
      dueDateIsAllDay,
      startDate,
      startDateIsAllDay,
      startDateTz,
      recurrence,
      alarms,
    }],
    collections: [{
      title,
      guid,
      ctag,
      order,
      color,
      symbolicColor,
      enabled,
      emailNotification,
      createdDate,
      isFamily,
      collectionShareType,
      createdDateExtended,
      participants,
      completedCount,
    }]
  }
*/
cloud.reminders()
  .then(console.log)
  .catch(console.error)
