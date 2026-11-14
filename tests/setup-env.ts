import "dotenv/config";
process.env.OUTBOX_DELIVERY ??= "off"; // tests check outbox rows directly; no background delivery
