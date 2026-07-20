import { createResponse } from "../utils/response.js";
export class NotificationController {
    notificationService;
    constructor(notificationService) {
        this.notificationService = notificationService;
    }
    listNotifications = async (req, res) => {
        const notifications = await this.notificationService.listForUser(req.user?.id ?? "");
        return res.status(200).json(createResponse("Notifications loaded", notifications));
    };
    markRead = async (req, res) => {
        const notificationId = typeof req.params.notificationId === "string" ? req.params.notificationId : "";
        const notification = await this.notificationService.markRead(notificationId);
        if (!notification) {
            return res.status(404).json(createResponse("Notification not found", null, {}, ["Notification not found"]));
        }
        return res.status(200).json(createResponse("Notification marked as read", notification));
    };
}
//# sourceMappingURL=notification-controller.js.map