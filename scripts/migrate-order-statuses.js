// ==========================================================
// Order Status Migration Script
// Maps legacy statuses to the new SmartTex B2B workflow
// ==========================================================
// Usage:
//   mongosh "mongodb://<host>:<port>/<database>" migrate-order-statuses.js
// or from mongo shell:
//   load("migrate-order-statuses.js")
// ==========================================================

const db = db.getSiblingDB("dppsmart"); // change if your DB name differs

print("=== Order Status Migration ===");
print("Database: " + db.getName());

// --- Migration map: legacy → new ---
const STATUS_MAP = {
  // New workflow already correct
  // "DRAFT":               "DRAFT",
  // "PENDING_REVIEW":      "PENDING_REVIEW",
  // "QUOTE_SENT":          "QUOTE_SENT",
  // "AWAITING_DEPOSIT":    "AWAITING_DEPOSIT",
  // "DEPOSIT_UNDER_REVIEW":"DEPOSIT_UNDER_REVIEW",
  // "CONFIRMED":           "CONFIRMED",
  // "PLANNED":             "PLANNED",
  // "IN_PRODUCTION":       "IN_PRODUCTION",
  // "PRODUCTION_COMPLETED":"PRODUCTION_COMPLETED",
  // "READY_FOR_DELIVERY":  "READY_FOR_DELIVERY",
  // "FINAL_PAYMENT_PENDING":"FINAL_PAYMENT_PENDING",
  // "DELIVERED":           "DELIVERED",
  // "CLOSED":              "CLOSED",
  // "CANCELLED":           "CANCELLED",
  // "REJECTED":            "REJECTED",

  // Legacy → new mapping
  "PENDING_QUOTATION":              "PENDING_REVIEW",
  "AWAITING_PAYMENT":               "AWAITING_DEPOSIT",
  "PAYMENT_UNDER_REVIEW":           "DEPOSIT_UNDER_REVIEW",
  "PAYMENT_RECEIVED":               "CONFIRMED",
  "READY":                          "READY_FOR_DELIVERY",
};

// --- Payment status mapping: legacy → new ---
const PAYMENT_STATUS_MAP = {
  "PAID":                           "PAID",
  "PARTIALLY_PAID":                 "PARTIALLY_PAID",
  "UNPAID":                         "UNPAID",
  "REFUNDED":                       "REFUNDED",
};

// --- Run migration ---
let updated = 0;
let skipped = 0;
let errors = 0;

const orders = db.orders.find({}).toArray();

for (const order of orders) {
  const oldStatus = order.status;
  let newStatus = STATUS_MAP[oldStatus];

  if (newStatus) {
    try {
      db.orders.updateOne(
        { _id: order._id },
        { $set: { status: newStatus, updatedAt: new Date() } }
      );
      print(`  OK  ${order._id}: "${oldStatus}" → "${newStatus}" (ref: ${order.orderReference || "N/A"})`);
      updated++;
    } catch (e) {
      print(`  ERR ${order._id}: ${e.message}`);
      errors++;
    }
  } else {
    // Already using a valid new status
    const validNewStatuses = [
      "DRAFT","PENDING_REVIEW","QUOTE_SENT","AWAITING_DEPOSIT",
      "DEPOSIT_UNDER_REVIEW","CONFIRMED","PLANNED","IN_PRODUCTION",
      "PRODUCTION_COMPLETED","READY_FOR_DELIVERY","FINAL_PAYMENT_PENDING",
      "DELIVERED","CLOSED","CANCELLED","REJECTED"
    ];
    if (validNewStatuses.includes(oldStatus)) {
      skipped++;
    } else {
      print(`  ??? ${order._id}: unknown status "${oldStatus}" — left unchanged`);
      skipped++;
    }
  }
}

// --- Payment status migration ---
let payUpdated = 0;
const payments = db.payments.find({}).toArray();

for (const pay of payments) {
  const oldPayStatus = pay.status;
  if (oldPayStatus === "CREATED" || oldPayStatus === "COMPLETED" || oldPayStatus === "DENIED") {
    let newPayStatus;
    if (oldPayStatus === "CREATED") newPayStatus = "PENDING";
    else if (oldPayStatus === "COMPLETED") newPayStatus = "APPROVED";
    else if (oldPayStatus === "DENIED") newPayStatus = "REJECTED";

    try {
      db.payments.updateOne(
        { _id: pay._id },
        { $set: { status: newPayStatus } }
      );
      print(`  PAY OK ${pay._id}: "${oldPayStatus}" → "${newPayStatus}"`);
      payUpdated++;
    } catch (e) {
      print(`  PAY ERR ${pay._id}: ${e.message}`);
      errors++;
    }
  }
}

// --- Summary ---
print("");
print("========================================");
print("Migration Complete");
print("========================================");
print(`Orders processed:  ${orders.length}`);
print(`  Updated:         ${updated}`);
print(`  Skipped (new):    ${skipped}`);
print(`  Errors:           ${errors}`);
print(`Payments updated:  ${payUpdated}`);
print("========================================");
