import argon2 from "argon2";

const password = process.argv[2];
if (!password) {
  process.stderr.write("Usage: pnpm --filter @inventory/api hash-password \"password\"\n");
  process.exitCode = 1;
} else {
  const hash = await argon2.hash(password, { type: argon2.argon2id });
  process.stdout.write(`${hash}\n`);
}
