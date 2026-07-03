import type { FastifyInstance } from "fastify";
import { activityLogQuerySchema, meActivitiesQuerySchema } from "./activity.schema.js";
import type { ActivityService } from "./activity.service.js";

const ok = <T>(data: T) => ({ ok: true as const, data });

export function registerActivityRoutes(app: FastifyInstance, service: ActivityService): void {
  const auth = { preHandler: app.authenticate };
  const team = { preHandler: app.requireRoles(["owner", "manager"]) };

  for (const prefix of ["/api", "/api/v1"]) {
    app.get(`${prefix}/me/stats`, auth, async (request) => ok(await service.meStats(request.user)));
    app.get(`${prefix}/me/activities`, auth, async (request) => {
      const query = meActivitiesQuerySchema.parse(request.query);
      return ok(await service.activities({ userId: request.user.userId, limit: query.limit }));
    });
    app.get(`${prefix}/team/stats`, team, async (request) => {
      const branchId = request.user.role === "manager" ? request.user.branchId : undefined;
      return ok(await service.teamStats(branchId));
    });
    app.get(`${prefix}/activity-log`, team, async (request) => {
      const query = activityLogQuerySchema.parse(request.query);
      return ok(await service.activities({
        ...query,
        branchId: request.user.role === "manager" ? request.user.branchId : query.branchId,
      }));
    });
  }
}
