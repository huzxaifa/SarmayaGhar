
import { db } from "../db";
import { properties, chatMessages, valuations } from "@shared/schema";
import { count } from "drizzle-orm";

async function verifyPersistence() {
  try {
    console.log("Verifying database persistence...");

    const [propertyCount] = await db.select({ count: count() }).from(properties);
    console.log(`Properties in DB: ${propertyCount.count}`);

    const [chatCount] = await db.select({ count: count() }).from(chatMessages);
    console.log(`Chat Messages in DB: ${chatCount.count}`);

    const [valuationCount] = await db.select({ count: count() }).from(valuations);
    console.log(`Valuations in DB: ${valuationCount.count}`);

    console.log("Verification complete.");
    process.exit(0);
  } catch (error) {
    console.error("Verification failed:", error);
    process.exit(1);
  }
}

verifyPersistence();
