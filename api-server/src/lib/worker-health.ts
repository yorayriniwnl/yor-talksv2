let notificationWorkerHealthy = false;

export function setNotificationWorkerHealthy(healthy: boolean): void {
  notificationWorkerHealthy = healthy;
}

export function isNotificationWorkerHealthy(): boolean {
  return notificationWorkerHealthy;
}