"use client";

import { api } from "@/lib/api";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

function canUsePush() {
  return typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    window.isSecureContext;
}

function normalizeSubscription(subscription: PushSubscription) {
  const json = subscription.toJSON();

  return {
    endpoint: subscription.endpoint,
    expirationTime: json.expirationTime ?? null,
    keys: {
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? ""
    }
  };
}

export function isPushSupported() {
  return canUsePush();
}

export async function enablePushNotifications() {
  if (!canUsePush()) {
    throw new Error("Push notifications require HTTPS and browser push support.");
  }

  let vapidPublicKey = VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    const config = await api.notifications.pushPublicKey<{ isConfigured: boolean; publicKey: string | null }>();
    vapidPublicKey = config.publicKey ?? undefined;
  }

  if (!vapidPublicKey) {
    throw new Error("Push notifications are not configured on the server.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission;

  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;

  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription = existingSubscription ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
  });

  await api.notifications.subscribePush(normalizeSubscription(subscription));
  return permission;
}

export async function disablePushNotifications() {
  if (!canUsePush()) return;

  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  await api.notifications.unsubscribePush({ endpoint: subscription.endpoint }).catch(() => undefined);
  await subscription.unsubscribe();
}
