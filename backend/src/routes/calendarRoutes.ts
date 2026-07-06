import { Router } from "express";
import { calendarController } from "../controllers/calendarController.js";
import { authRequired } from "../middlewares/authRequired.js";
import { anyPermissionRequired, permissionRequired } from "../middlewares/permissionRequired.js";
import {
  calendarEventSchema,
  developerLeaveSchema,
  holidaySchema,
  updateCalendarEventSchema,
  updateDeveloperLeaveSchema,
  updateHolidaySchema
} from "../validators/calendarValidators.js";
import { validateBody } from "../validators/validate.js";

export const calendarRoutes = Router();

calendarRoutes.use(authRequired);

calendarRoutes.get("/events", anyPermissionRequired(["calendar.view", "leave.view", "holiday.view"]), calendarController.listEvents);
calendarRoutes.post("/events", permissionRequired("calendar.manage"), validateBody(calendarEventSchema), calendarController.createEvent);
calendarRoutes.patch("/events/:id", permissionRequired("calendar.manage"), validateBody(updateCalendarEventSchema), calendarController.updateEvent);
calendarRoutes.delete("/events/:id", permissionRequired("calendar.manage"), calendarController.deleteEvent);

calendarRoutes.get("/leaves", permissionRequired("leave.view"), calendarController.listLeaves);
calendarRoutes.post("/leaves", permissionRequired("leave.manage"), validateBody(developerLeaveSchema), calendarController.createLeave);
calendarRoutes.patch("/leaves/:id", permissionRequired("leave.manage"), validateBody(updateDeveloperLeaveSchema), calendarController.updateLeave);
calendarRoutes.delete("/leaves/:id", permissionRequired("leave.manage"), calendarController.deleteLeave);

calendarRoutes.get("/holidays", permissionRequired("holiday.view"), calendarController.listHolidays);
calendarRoutes.post("/holidays", permissionRequired("holiday.manage"), validateBody(holidaySchema), calendarController.createHoliday);
calendarRoutes.patch("/holidays/:id", permissionRequired("holiday.manage"), validateBody(updateHolidaySchema), calendarController.updateHoliday);
calendarRoutes.delete("/holidays/:id", permissionRequired("holiday.manage"), calendarController.deleteHoliday);

calendarRoutes.get("/availability", permissionRequired("availability.view"), calendarController.availability);
calendarRoutes.get("/workload", permissionRequired("availability.view"), calendarController.workload);
