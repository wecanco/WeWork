/* Custom push notification handling for PWA */
/* eslint-disable no-restricted-globals */

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch (err) {
    try {
      payload = JSON.parse(event.data?.text?.() || '{}')
    } catch (e) {
      payload = {}
    }
  }

  const title = payload.title || 'پیام جدید'
  const options = {
    body: payload.body || payload.message || '',
    data: {
      link: payload.link || '/',
      type: payload.type || 'generic',
    },
    icon: '/pwa-icon.svg',
    badge: '/pwa-icon.svg',
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification?.data?.link || '/'

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true })
      const matchedClient = allClients.find((client) => client.url.includes(targetUrl))

      if (matchedClient) {
        await matchedClient.focus()
      } else {
        await clients.openWindow(targetUrl)
      }
    })(),
  )
})

