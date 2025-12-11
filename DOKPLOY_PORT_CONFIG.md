# Dokploy Port Configuration Fix

If your site is showing "Listening on http://localhost:8000/" but not accessible via your domain, follow these steps:

## Issue
Dokploy may be mapping the container's port 80 to a different external port (like 8000), or there's a port configuration mismatch.

## Solution 1: Configure Port in Dokploy

1. **Go to your Dokploy application settings**
2. **Find "Port" or "Container Port" setting**
3. **Set it to `80`** (this is what nginx listens on inside the container)
4. **If there's an "External Port" or "Host Port" setting**, you can leave it as auto or set it to `80` if you have root access, or `8000` if that's what Dokploy assigned

## Solution 2: Update nginx to listen on the correct port

If Dokploy requires a different port, you can update the nginx configuration. However, **port 80 is standard for HTTP**, so this is usually not necessary.

## Solution 3: Check Domain Configuration

1. **In Dokploy, go to your application's domain settings**
2. **Ensure `sparklwishes.com` is configured**
3. **Check that SSL is enabled** (Dokploy should handle Let's Encrypt automatically)
4. **Verify DNS**: Make sure your domain's A record points to your VPS IP address

## Solution 4: Check Dokploy Reverse Proxy

Dokploy uses a reverse proxy (usually Traefik or Nginx). The container port 80 should be automatically exposed. If you're seeing `localhost:8000`, it might mean:

- The service is running but not properly exposed through Dokploy's reverse proxy
- You need to configure the domain in Dokploy's domain settings
- The reverse proxy isn't routing traffic correctly

## Quick Checklist

- [ ] Container is running (check Dokploy dashboard)
- [ ] Port is set to `80` in Dokploy
- [ ] Domain `sparklwishes.com` is configured in Dokploy
- [ ] DNS A record points to your VPS IP
- [ ] SSL certificate is issued (check in Dokploy)
- [ ] Firewall allows ports 80 and 443

## Testing

1. **Test container directly**: 
   ```bash
   # SSH into your VPS
   docker ps  # Find your container
   docker exec -it <container-id> wget -O- http://localhost/health
   # Should return "healthy"
   ```

2. **Test from VPS**:
   ```bash
   curl http://localhost:8000/health
   # Or if port 80 is exposed:
   curl http://localhost/health
   ```

3. **Test domain**:
   ```bash
   curl http://sparklwishes.com/health
   ```

## If Still Not Working

1. Check Dokploy logs for errors
2. Verify environment variables are set correctly
3. Ensure the build completed successfully
4. Check that `dist` folder contains built files in the container:
   ```bash
   docker exec -it <container-id> ls -la /usr/share/nginx/html
   ```


