import { readFileSync } from "node:fs";
import { google, type sheets_v4 } from "googleapis";

export const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

export function createSheetsClient(): { sheets: sheets_v4.Sheets; spreadsheetId: string } {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID?.trim();
  if (!spreadsheetId) throw new Error("Missing GOOGLE_SHEET_ID");
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE?.trim();
  let credentials: { client_email: string; private_key: string } | undefined;
  if (keyFile) {
    const parsed = JSON.parse(readFileSync(keyFile, "utf8")) as Record<string, unknown>;
    if (typeof parsed.client_email !== "string" || typeof parsed.private_key !== "string") throw new Error("Service Account key is missing client_email or private_key");
    credentials = { client_email: parsed.client_email, private_key: parsed.private_key };
  } else {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!email || !privateKey) throw new Error("Missing Google Service Account credentials");
    credentials = { client_email: email, private_key: privateKey };
  }
  google.options({ timeout: 20_000 });
  const auth = new google.auth.GoogleAuth({ credentials, scopes: [GOOGLE_SHEETS_SCOPE] });
  return { sheets: google.sheets({ version: "v4", auth }), spreadsheetId };
}
