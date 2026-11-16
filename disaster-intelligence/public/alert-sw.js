self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(windows => {
    const existing = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) return existing.navigate("/alerts").then(client => client?.focus());
    return clients.openWindow("/alerts");
  }));
});
