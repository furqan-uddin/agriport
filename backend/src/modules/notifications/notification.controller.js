import Notification from './notification.model.js';
import asyncWrapper from '../../utils/asyncWrapper.js';
import AppError from '../../utils/AppError.js';
import { successResponse } from '../../utils/apiResponse.js';
import { paginate } from '../../utils/paginate.js';
import { registerClient, unregisterClient } from './sseManager.js';

// 1. Get notifications for the logged-in user
export const getNotifications = asyncWrapper(async (req, res) => {
  const queryObj = { recipientId: req.user._id };

  const result = await paginate(Notification, queryObj, req.query, {
    sort: { createdAt: -1 }
  });

  return successResponse(
    res,
    {
      notifications: result.docs,
      pagination: result.pagination,
    },
    200,
    'Notifications retrieved successfully.'
  );
});

// 2. Mark a notification as read
export const markAsRead = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const notification = await Notification.findOne({ _id: id, recipientId: req.user._id });
  if (!notification) {
    return next(new AppError('Notification not found.', 404));
  }

  notification.read = true;
  await notification.save();

  return successResponse(res, notification, 200, 'Notification marked as read.');
});

// 3. Mark all notifications as read
export const markAllAsRead = asyncWrapper(async (req, res) => {
  await Notification.updateMany(
    { recipientId: req.user._id, read: false },
    { $set: { read: true } }
  );

  return successResponse(res, null, 200, 'All notifications marked as read.');
});

// 4. Stream notifications and pings via SSE (Server-Sent Events)
export const streamNotifications = (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  res.write(': sse connection established\n\n');

  registerClient(req.user._id, res);

  const heartbeatInterval = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeatInterval);
    unregisterClient(req.user._id, res);
    res.end();
  });
};
