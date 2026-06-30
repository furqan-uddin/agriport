import logger from '../../config/logger.js';

// Map of userId string -> Set of Express Response objects
const activeClients = new Map();

export const registerClient = (userId, res) => {
  const userIdStr = userId.toString();
  if (!activeClients.has(userIdStr)) {
    activeClients.set(userIdStr, new Set());
  }
  activeClients.get(userIdStr).add(res);
  logger.info(`[SSE] Client registered for user ${userIdStr}. Active connections: ${activeClients.get(userIdStr).size}`);
};

export const unregisterClient = (userId, res) => {
  const userIdStr = userId.toString();
  if (activeClients.has(userIdStr)) {
    const resSet = activeClients.get(userIdStr);
    resSet.delete(res);
    logger.info(`[SSE] Client unregistered for user ${userIdStr}. Active connections remaining: ${resSet.size}`);
    if (resSet.size === 0) {
      activeClients.delete(userIdStr);
    }
  }
};

export const sendSSEMessage = (userId, eventName, data) => {
  const userIdStr = userId.toString();
  if (activeClients.has(userIdStr)) {
    const resSet = activeClients.get(userIdStr);
    const message = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of resSet) {
      try {
        res.write(message);
      } catch (err) {
        logger.error(`[SSE] Error writing message to user ${userIdStr}:`, err);
      }
    }
  }
};

export const broadcastSSEMessage = (eventName, data) => {
  const message = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [userId, resSet] of activeClients.entries()) {
    for (const res of resSet) {
      try {
        res.write(message);
      } catch (err) {
        logger.error(`[SSE] Error broadcasting message to user ${userId}:`, err);
      }
    }
  }
};
