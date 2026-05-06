This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Note

This project is configured for Next.js deployment on Vercel.

## NAS Gallery Setup

1. Create the `gallery_items` table in PostgreSQL. The table shape is documented in `supabase/gallery-setup.sql`; skip the Supabase Storage bucket statement when using plain PostgreSQL.
2. Copy `DATABASE_URL`, `GALLERY_ASSET_DIR`, and `GALLERY_ASSET_BASE_URL` into `.env.local`.
3. Place gallery files under the public asset directory, preserving paths like `task-2/openai/file.png`.
4. Restart the Next.js server after updating environment variables.
5. Run `npm run verify:gallery` to confirm table read/write, asset file write, public URL access, and cleanup all succeed.

### Verification Notes

- `DATABASE_URL` should point to the NAS PostgreSQL port, for example `postgresql://aiedu_user:password@192.168.0.6:5433/aieducation`.
- `GALLERY_ASSET_DIR` is the filesystem path where the running Next.js server can write gallery files. On a Mac, this may be a mounted NAS path such as `/Volumes/web/ai_gallery`; inside a NAS container, use the mounted container path.
- `GALLERY_ASSET_BASE_URL` is the browser-visible URL for the same directory, for example `http://192.168.0.6/ai_gallery`.
- The verification script inserts one temporary probe row and one temporary probe file, then deletes both immediately after the check.

## Synology Docker Deployment

The app is configured for Next.js standalone output and can run in Synology Container Manager.

1. Copy this project folder to the NAS, excluding `node_modules`, `.next`, and `migration`.
2. Create `.env.production` on the NAS using `deploy/synology.env.example` as a template.
3. In Container Manager, create a Project from `docker-compose.synology.yml`.

The compose file maps:

```text
NAS 3000 -> Container 3000
/volume1/web/ai_gallery -> /app/gallery-assets
```

If you prefer manual Docker commands, build the image from this folder:

```bash
docker build -t aieducation-web .
```

Then create a container from `aieducation-web` and map the container port:

```text
NAS 3000 -> Container 3000
```

Mount the NAS gallery folder:

```text
/volume1/web/ai_gallery -> /app/gallery-assets
```

Set environment variables using `deploy/synology.env.example` as a template.

Inside the NAS container, use:

```env
DATABASE_URL=postgresql://aiedu_user:password@192.168.0.6:5433/aieducation
GALLERY_ASSET_DIR=/app/gallery-assets
GALLERY_ASSET_BASE_URL=http://pckwgallery.synology.me/ai_gallery
```

After the container starts, test the app at:

```text
http://192.168.0.6:3000
```
