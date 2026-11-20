import { Router } from "express";
import { shipmentReportInput } from "./modules/reports/domain.js";

export function reportsRouter(services) {
  const router = Router();
  router.get("/reports/shipments", async (req, res) =>
    res.json(
      await services.reports.shipments(
        req.actor,
        shipmentReportInput.parse(req.query),
      ),
    ),
  );
  return router;
}
