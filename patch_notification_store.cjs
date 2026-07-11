const fs = require('fs');
let code = fs.readFileSync('src/stores/notificationStore.ts', 'utf8');

const typeMatch = `  createNotificationEvent: (
    type: NotificationType,
    senderId: string,
    recipientId: string,
    title: string,
    body: string,
    metadata?: Record<string, any>
  ) => Promise<void>;`;

const typeReplace = `  createNotificationEvent: (
    type: NotificationType,
    senderId: string,
    recipientId: string,
    title: string,
    body: string,
    metadata?: Record<string, any>,
    idempotencyKey?: string
  ) => Promise<void>;`;

code = code.replace(typeMatch, typeReplace);

const funcMatch = `  createNotificationEvent: async (type, senderId, recipientId, title, body, metadata) => {
    try {
      const eventId = crypto.randomUUID();`;

const funcReplace = `  createNotificationEvent: async (type, senderId, recipientId, title, body, metadata, idempotencyKey) => {
    try {
      const eventId = idempotencyKey || crypto.randomUUID();`;

code = code.replace(funcMatch, funcReplace);

const notifMatch = `      const notifId = crypto.randomUUID();
      const notification: AppNotification = {`;

const notifReplace = `      const notifId = idempotencyKey ? \`notif_\${idempotencyKey}\` : crypto.randomUUID();
      const notification: AppNotification = {`;

code = code.replace(notifMatch, notifReplace);

fs.writeFileSync('src/stores/notificationStore.ts', code);
console.log("Patched notificationStore.ts");
