import "dotenv/config";
import { buildApp } from "./app.js";
import { createSheetsClient } from "./plugins/google-sheets.js";
import { GoogleSheetsInventoryRepository } from "./repositories/google-sheets-inventory-repository.js";

const { sheets, spreadsheetId } = createSheetsClient();
export const repository = new GoogleSheetsInventoryRepository(sheets, spreadsheetId);
export const fastify = await buildApp(repository);

if (process.env.NODE_ENV !== "test") {
  const port = Number.parseInt(process.env.PORT ?? "4000", 10);
  await fastify.listen({ port, host: "0.0.0.0" });
}
