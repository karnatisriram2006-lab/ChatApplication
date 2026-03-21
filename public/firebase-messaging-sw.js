importScripts(
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js'
);
importScripts(
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js'
);

firebase.initializeApp({
  apiKey: 'REPLACE_WITH_NEXT_PUBLIC_FIREBASE_API_KEY',
  authDomain: 'REPLACE_WITH_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  projectId: 'REPLACE_WITH_NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  storageBucket: 'REPLACE_WITH_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'REPLACE_WITH_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'REPLACE_WITH_NEXT_PUBLIC_FIREBASE_APP_ID',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  const notification = payload.notification || {};
  const data = payload.data || {};

  self.registration.showNotification(notification.title || 'New message', {
    body: notification.body || '',
    icon: notification.icon || '/icon-192.png',
    badge: '/badge-72.png',
    tag: data.roomId || 'message',
    renotify: true,
    data: {
      roomId: data.roomId,
      url: data.url || '/',
    },
  });
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var roomId = event.notification.data && event.notification.data.roomId;
  var url = roomId ? '/chat/' + roomId : (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
