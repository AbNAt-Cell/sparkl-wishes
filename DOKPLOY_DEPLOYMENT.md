# Dokploy Deployment Guide for Sparkl Wishes

This guide will help you deploy Sparkl Wishes to your Hostinger VPS using Dokploy.

## Prerequisites

- Hostinger VPS with Dokploy installed
- Domain name pointing to your VPS (sparklwishes.com)
- Supabase project with API keys
- Paystack account (optional, for payments)

## Step 1: Configure Environment Variables in Dokploy

1. Log into your Dokploy dashboard
2. Create a new application or select your existing one
3. Go to **Environment Variables** section
4. Add the following variables:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
```

**Important**: These must be set as **Build-time** environment variables since Vite requires them during the build process.

## Step 2: Configure Dokploy Application Settings

In your Dokploy application settings, configure:

### Build Settings:
- **Build Command**: `npm run build`
- **Build Output Directory**: `dist`
- **Dockerfile Path**: `Dockerfile` (or leave empty if using default)

### Port Settings:
- **Port**: `80` (nginx default)
- **Protocol**: `HTTP`

### Domain Settings:
- **Domain**: `sparklwishes.com`
- **Enable SSL**: Yes (Dokploy should handle Let's Encrypt automatically)

## Step 3: Deploy

1. Connect your Git repository to Dokploy
2. Select the branch you want to deploy (usually `main` or `master`)
3. Click **Deploy**

Dokploy will:
- Build the Docker image
- Run the build process with your environment variables
- Start the nginx container serving your static files

## Step 4: Verify Deployment

After deployment, verify:

1. **Homepage loads**: Visit `https://sparklwishes.com`
2. **SPA routing works**: Try navigating to `https://sparklwishes.com/dashboard` or any other route
3. **API connections**: Check browser console for any Supabase connection errors

## Troubleshooting

### Site shows blank page

**Possible causes:**
1. **Environment variables not set**: Check Dokploy environment variables are configured
2. **Build failed**: Check build logs in Dokploy
3. **Nginx not serving files**: Check container logs

**Solution:**
- Verify environment variables are set in Dokploy
- Check build logs for errors
- Ensure `dist` folder contains built files

### Routes return 404

**Cause**: Nginx not configured for SPA routing

**Solution**: The `nginx.conf` file should handle this. Verify it's being copied in the Dockerfile.

### Assets not loading (CSS/JS)

**Cause**: Incorrect base path or nginx configuration

**Solution**: 
- Check that `vite.config.ts` doesn't have a custom `base` path
- Verify nginx.conf is serving static files correctly

### Environment variables not working

**Important**: Vite requires environment variables at **build time**, not runtime.

**Solution**:
- In Dokploy, ensure environment variables are marked as **Build-time** variables
- If Dokploy doesn't support build-time variables, you may need to:
  1. Build locally with `.env` file
  2. Push the `dist` folder
  3. Use a simpler Dockerfile that just serves pre-built files

## Alternative: Pre-built Deployment

If Dokploy doesn't support build-time environment variables, you can build locally and deploy the `dist` folder:

### Option 1: Build Locally and Deploy

1. Create `.env` file locally with your variables
2. Run `npm run build`
3. Commit the `dist` folder (temporarily remove from `.gitignore`)
4. Use a simpler Dockerfile:

```dockerfile
FROM nginx:alpine
COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Option 2: Multi-stage Build with Build Args

Modify Dockerfile to accept build arguments:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_PAYSTACK_PUBLIC_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_PAYSTACK_PUBLIC_KEY=$VITE_PAYSTACK_PUBLIC_KEY
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Then in Dokploy, pass build arguments instead of environment variables.

## Health Check

The nginx configuration includes a health check endpoint at `/health`. You can configure Dokploy to use this for health checks.

## SSL/HTTPS

Dokploy should automatically handle SSL certificates via Let's Encrypt. Ensure:
- Your domain DNS is pointing to your VPS
- Port 80 and 443 are open in your firewall
- Dokploy SSL settings are enabled for your domain

## Support

If you continue to have issues:
1. Check Dokploy application logs
2. Check nginx container logs: `docker logs <container-id>`
3. Verify environment variables are accessible during build
4. Test the build locally first: `npm run build && npm run preview`

