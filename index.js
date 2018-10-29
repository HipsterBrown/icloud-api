// node builtins
const qs = require('querystring')
const url = require('url')

// npm modules
const fetch = require('isomorphic-unfetch')
const uuid = require('uuid/v1')

const ICLOUD_ACCOUNT_URI = 'https://setup.icloud.com/setup/ws/1/accountLogin'

class Cloud {
  /*
   * returns a date formatted for icloud storage
   */
  static formatICloudDate (date) {
    const value = new Array(7)
    value[1] = date.getUTCFullYear()
    value[2] = date.getUTCMonth() + 1
    value[3] = date.getUTCDate()
    value[4] = date.getUTCHours()
    value[5] = date.getUTCMinutes()
    value[6] = date.getUTCSeconds()
    value[0] = Number(value.slice(1, 4).join(''))

    return value
  }

  constructor ({ appleId, password }) {
    Object.assign(this, { appleId, password })

    this.user = null
    this.services = {}

    this.cookies = []
  }

  async login () {
    if (this.user) {
      return this.user
    }

    const accountResponse = await fetch(ICLOUD_ACCOUNT_URI, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ apple_id: this.appleId, password: this.password, extended_login: false })
    })

    if (accountResponse.status !== 200) {
      const text = await accountResponse.text()
      throw new Error(`Response ${accountResponse.status}: ${text}`)
    }

    const {
      dsInfo: user,
      webservices: services
    } = await accountResponse.json()

    this.user = user
    this.services = services
    this.cookies = accountResponse.headers.get('set-cookie').replace(/(Secure|HttpOnly),/gi, '$1;')

    return this.user
  }

  /*
   * returns object with incomplete reminders and collections
   */
  async reminders () {
    if (!this.user) {
      await this.login()
    }

    const { reminders: service } = this.services

    if (!service) {
      throw new Error('This iCloud account does not support reminders')
    }

    // create helper for this formatting
    const serviceUrl = url.parse(service.url)
    serviceUrl.pathname = '/rd/startup'
    serviceUrl.search = this.params()
    delete serviceUrl.host
    delete serviceUrl.port

    const response = await fetch(url.format(serviceUrl), {
      headers: this.headers()
    })

    try {
      const { Collections, Reminders } = await response.clone().json()
      return {
        collections: Collections,
        reminders: Reminders
      }
    } catch (_) {
      const text = await response.text()
      throw new Error(`Response ${response.status}: ${text}`)
    }
  }

  /*
   * reminder (Object):
   *   - title (string) (required): the name of the reminder
   *   - description (string)
   *   - guid (string|number): automatically generated if not provided
   *   - pGuid (string|number): guid of the parent Collection, defaults to 'tasks'
   *   - dueDate (Array): date formatted for icloud, using formatICloudDate
   *   - dueDateIsAllDay (boolean)
   *   - startDate (Array): date formatted for icloud, using formatICloudDate
   *   - startDateIsAllDay (boolean)
   *   - priority (number: 1-9)
   * returns the updated list of reminders
   */
  async createReminder (reminder) {
    if (!this.user) {
      await this.login()
    }

    const { reminders: service } = this.services

    if (!service) {
      throw new Error('This iCloud account does not support reminders')
    }

    const serviceUrl = url.parse(service.url)
    serviceUrl.pathname = `/rd/reminders/${reminder.pGuid || 'tasks'}`
    serviceUrl.search = this.params()
    delete serviceUrl.host
    delete serviceUrl.port

    // not including ClientState leads to success but no response ChangeSet
    const response = await fetch(url.format(serviceUrl), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        'Reminders': {
          guid: uuid(),
          pGuid: 'tasks',
          ...reminder
        },
        'ClientState': {}
      })
    })

    try {
      const {
        ChangeSet: {
          inserts: {
            Reminders
          }
        }
      } = await response.clone().json()
      return Reminders
    } catch (_) {
      const text = await response.text()
      throw new Error(`Response ${response.status}: ${text}`)
    }
  }

  /*
   * reminder (Object):
   *   - guid (string) (required): unique identifier for the reminder
   *   - title (string): the name of the reminder
   *   - description (string)
   *   - guid (string|number): automatically generated if not provided
   *   - pGuid (string|number): guid of the parent Collection, defaults to 'tasks'
   *   - dueDate (Array): date formatted for icloud, using formatICloudDate
   *   - dueDateIsAllDay (boolean)
   *   - startDate (Array): date formatted for icloud, using formatICloudDate
   *   - startDateIsAllDay (boolean)
   *   - priority (number: 1-9)
   *   - completedDate (Array): date formatted for icloud, using formatICloudDate
   * returns the updated list of reminders
   */
  async updateReminder (reminder) {
    if (!this.user) {
      await this.login()
    }

    const { reminders: service } = this.services

    if (!service) {
      throw new Error('This iCloud account does not support reminders')
    }

    const serviceUrl = url.parse(service.url)
    serviceUrl.pathname = `/rd/reminders/${reminder.pGuid || 'tasks'}`
    serviceUrl.search = this.params()
    delete serviceUrl.host
    delete serviceUrl.port

    // not including ClientState leads to success but no response ChangeSet
    const response = await fetch(url.format(serviceUrl), {
      method: 'POST',
      headers: this.headers({ methodOverride: 'PUT' }),
      body: JSON.stringify({
        'Reminders': {
          pGuid: 'tasks',
          ...reminder
        },
        'ClientState': {}
      })
    })

    try {
      const {
        ChangeSet: {
          inserts: {
            Reminders
          }
        }
      } = await response.clone().json()
      return Reminders
    } catch (_) {
      const text = await response.text()
      throw new Error(`Response ${response.status}: ${text}`)
    }
  }

  headers (custom = {}) {
    return {
      ...custom,
      origin: 'https://www.icloud.com',
      cookie: this.cookies,
      'Content-Type': 'application/json'
    }
  }

  params (custom = {}) {
    return qs.stringify({
      ...custom,
      lang: 'en-us',
      usertz: 'America/New_York',
      dsid: this.user.dsid
    })
  }
}

module.exports = Cloud
