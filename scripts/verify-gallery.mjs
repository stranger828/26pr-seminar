import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const { Pool } = pg;

const requiredEnvKeys = [
  "DATABASE_URL",
  "GALLERY_ASSET_DIR",
  "GALLERY_ASSET_BASE_URL",
];
const missingKeys = requiredEnvKeys.filter((key) => !process.env[key]);

if (missingKeys.length > 0) {
  console.error(
    `Missing environment variables: ${missingKeys.join(", ")}. Copy them into .env.local first.`,
  );
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const probeId = randomUUID();
const probeAssetPath = `healthcheck/${probeId}.txt`;
const probeFilePath = resolveAssetFilePath(probeAssetPath);
const probeContent = Buffer.from(
  `gallery probe ${new Date().toISOString()}\n`,
  "utf8",
);
const summary = [];

try {
  await pool.query("select id from public.gallery_items limit 1");
  summary.push("gallery_items table read: ok");

  await fs.mkdir(path.dirname(probeFilePath), { recursive: true });
  await fs.writeFile(probeFilePath, probeContent, { flag: "wx" });
  summary.push("asset file write: ok");

  const publicUrl = `${process.env.GALLERY_ASSET_BASE_URL.replace(/\/+$/, "")}/${probeAssetPath}`;
  const response = await fetch(publicUrl);

  if (!response.ok) {
    throw new Error(`public asset URL failed: ${response.status} ${publicUrl}`);
  }

  summary.push(`public asset URL: ok (${publicUrl})`);

  await pool.query(
    `insert into public.gallery_items (
       id,
       task_step,
       task_title,
       type,
       provider,
       external_job_id,
       prompt,
       secondary_prompt,
       result_text,
       asset_path,
       mime_type
     ) values (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
     )`,
    [
      probeId,
      "1",
      "갤러리 연결 확인",
      "text",
      "openai",
      `probe-${probeId}`,
      "갤러리 연결 확인용 테스트 프롬프트",
      null,
      "Gallery probe row",
      probeAssetPath,
      "text/plain",
    ],
  );
  summary.push("gallery_items insert: ok");

  const { rows } = await pool.query(
    "select id, asset_path, created_at from public.gallery_items where id = $1",
    [probeId],
  );

  if (rows.length !== 1) {
    throw new Error("gallery_items readback failed");
  }

  summary.push(
    `gallery_items readback: ok (${rows[0].id} at ${formatTimestamp(rows[0].created_at)})`,
  );
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Gallery verification failed.",
  );
  process.exitCode = 1;
} finally {
  try {
    await pool.query("delete from public.gallery_items where id = $1", [probeId]);
    summary.push("cleanup row: ok");
  } catch (error) {
    console.error(
      `Cleanup warning (row): ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  try {
    await fs.unlink(probeFilePath);
    summary.push("cleanup asset: ok");
  } catch (error) {
    if (!isNodeError(error) || error.code !== "ENOENT") {
      console.error(
        `Cleanup warning (asset): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  await pool.end();
}

for (const line of summary) {
  console.log(`- ${line}`);
}

if (process.exitCode && process.exitCode !== 0) {
  process.exit(process.exitCode);
}

function resolveAssetFilePath(assetPath) {
  const root = path.resolve(process.env.GALLERY_ASSET_DIR);
  const filePath = path.resolve(root, assetPath);

  if (filePath !== root && filePath.startsWith(`${root}${path.sep}`)) {
    return filePath;
  }

  throw new Error("Invalid asset path");
}

function isNodeError(error) {
  return error instanceof Error && "code" in error;
}

function formatTimestamp(value) {
  return value instanceof Date ? value.toISOString() : String(value);
}
