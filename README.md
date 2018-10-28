# iCloud API

Manage iCloud login and reminders with JavaScript!

**Two-Factor Auth accounts are not currently supported**

Example:

```node
const Cloud = require('icloud-api')
const cloud = new Cloud({ appleId: /* user apple ID */, password: /* user iCloud password */ })

// "top-level" await
(async () => {
  // call login manually to get user data
  const user = await cloud.login()
  console.log(user)

  // user data available as a property after login
  console.log(cloud.user);

  // get all incomplete reminders and parent collections, will login automatically if needed
  const remindersAndCollections = await cloud.reminders()
  console.log(remindersAndCollections);

  // when creating a reminder, the latest list of reminders is returned
  const reminder = { title: 'My new reminder' };
  const latestReminders = await cloud.createReminder(reminder);
  console.log(latestReminders);
})();
```
