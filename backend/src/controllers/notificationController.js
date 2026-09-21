import {
    getUserNotifications,
    markAllNotificationsRead as markAllModel,
    markNotificationRead as markNotificationModel
} from '../models/sql/notificationSqlModel.js';

export const getNotifications = async (req, res, next) => {
    try {
        const notifications = await getUserNotifications(req.user);
        return res.json({ success: true, data: notifications });
    } catch (error) {
        next(error);
    }
};

export const markNotificationRead = async (req, res, next) => {
    try {
        const rawId = req.params.id;
        if (!rawId || String(rawId).trim().length === 0) {
            return res.status(400).json({ success: false, error: { message: 'Invalid notification id.' } });
        }
        await markNotificationModel(req.user.id, rawId);
        return res.json({ success: true, data: { id: rawId, read: true } });
    } catch (error) {
        next(error);
    }
};

export const markAllNotificationsRead = async (req, res, next) => {
    try {
        const notifications = await markAllModel(req.user);
        return res.json({ success: true, data: notifications });
    } catch (error) {
        next(error);
    }
};

