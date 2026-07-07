self.addEventListener("push", (event) => {
  if (!event.data) return;

  const payload = event.data.json();
  const title = payload.title || "PMS notification";
  const options = {
    body: payload.body || payload.message || "",
    tag: payload.id || payload.tag || "pms-notification",
    data: {
      url: payload.url || "/dashboard",
      notificationId: payload.id,
      type: payload.type,
      metadata: payload.metadata
    },
    badge: "/favicon.ico",
    icon: "/favicon.ico"
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href;

  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

    for (const client of clientsList) {
      if ("focus" in client) {
        client.navigate(targetUrl);
        return client.focus();
      }
    }

    return self.clients.openWindow(targetUrl);
  })());
});
