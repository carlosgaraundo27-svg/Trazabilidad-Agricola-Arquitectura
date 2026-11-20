export function reportsRepository() {
  return {
    async shipments(tx, actor, input) {
      return (
        await tx.query(
          `SELECT s.id AS "shipmentId",s.center_id AS "centerId",c.name AS "centerName",
          e.lot_id AS "lotId",s.state,s.quantity_kg::text AS "quantityKg",'kg'::text AS unit,
          s.departed_at AS "departedAt",
          CASE WHEN s.state='delivered' THEN d.received_kg::text END AS "receivedKg",
          CASE WHEN s.state='delivered' THEN d.delivered_at END AS "deliveredAt",
          CASE WHEN s.state='delivered' AND d.delivered_at>=s.departed_at
            THEN EXTRACT(EPOCH FROM (d.delivered_at-s.departed_at))::numeric(18,3)::text END AS "durationSeconds",
          ((s.state='delivered' AND (d.shipment_id IS NULL OR d.delivered_at<s.departed_at))
            OR (s.state='in_transit' AND d.shipment_id IS NOT NULL)) AS "dataIssue"
        FROM logistics.shipments s
        JOIN inventory.entries e ON e.id=s.entry_id AND e.organization_id=s.organization_id AND e.center_id=s.center_id
        JOIN access.centers c ON c.id=s.center_id AND c.organization_id=s.organization_id
        LEFT JOIN logistics.deliveries d ON d.shipment_id=s.id AND d.entry_id=s.entry_id AND d.organization_id=s.organization_id AND d.center_id=s.center_id
        WHERE s.organization_id=$1 AND s.center_id=$2
          AND s.state IN ('in_transit','delivered')
          AND s.departed_at >= $3::timestamptz AND s.departed_at < $4::timestamptz
          AND ($5::text IS NULL OR s.state=$5)
          AND ($6::uuid IS NULL OR e.lot_id=$6)
          AND ($7::timestamptz IS NULL OR (s.departed_at,s.id)>($7::timestamptz,$8::uuid))
        ORDER BY s.departed_at,s.id LIMIT $9`,
          [
            actor.organizationId,
            input.centerId,
            input.from,
            input.to,
            input.state ?? null,
            input.lotId ?? null,
            input.afterDepartedAt ?? null,
            input.afterShipmentId ?? null,
            input.limit + 1,
          ],
        )
      ).rows;
    },
  };
}
