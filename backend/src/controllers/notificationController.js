import {
    getAnnouncementNotifications,
    markAllAnnouncementsRead,
    markAnnouncementRead
} from '../models/sql/notificationSqlModel.js';

export const getNotifications = async (req, res, next) => {
    try {
        const notifications = await getAnnouncementNotifications(req.user);
        return res.json({ success: true, data: notifications });
    } catch (error) {
        next(error);
    }
};

export const markNotificationRead = async (req, res, next) => {
    try {
        const announcementId = Number(req.params.id);
        if (!Number.isInteger(announcementId) || announcementId < 1) {
            return res.status(400).json({ success: false, error: { message: 'Invalid notification id.' } });
        }
        await markAnnouncementRead(req.user.id, announcementId);
        return res.json({ success: true, data: { id: announcementId, read: true } });
    } catch (error) {
        next(error);
    }
};

export const markAllNotificationsRead = async (req, res, next) => {
    try {
        await markAllAnnouncementsRead(req.user);
        const notifications = await getAnnouncementNotifications(req.user);
        return res.json({ success: true, data: notifications });
    } catch (error) {
        next(error);
    }
};
