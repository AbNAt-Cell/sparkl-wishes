# Deployment Options for Dokploy

You have two options for serving your React SPA on Dokploy:

## Option 1: Nginx (Recommended - Current Setup)

**Files**: `Dockerfile`, `nginx.conf`

**Pros:**
- ✅ Lightweight and fast
- ✅ Better for static files
- ✅ Lower memory usage
- ✅ Industry standard for serving static sites

**Configuration:**
- Container listens on port `80`
- Dokploy should map this to your domain
- Set port to `80` in Dokploy settings

**When to use:** Default choice, works great for most cases

---

## Option 2: Node.js/Express Server

**Files**: `Dockerfile.node`, `server.js`

**Pros:**
- ✅ More flexible (can add API routes later)
- ✅ Easier to debug
- ✅ Can use Node.js ecosystem

**Cons:**
- ❌ Higher memory usage
- ❌ Slower for pure static files
- ❌ More dependencies

**Configuration:**
- Container listens on port `3000` (or PORT env var)
- Set port to `3000` in Dokploy settings
- Server binds to `0.0.0.0` to accept external connections

**When to use:** If you need Node.js features or Dokploy has issues with nginx

---

## Which One to Use?

**Use Nginx (Option 1)** if:
- You just need to serve static files ✅
- You want the best performance ✅
- You want the smallest container size ✅

**Use Node.js (Option 2)** if:
- Dokploy has issues with nginx
- You plan to add API routes later
- You prefer Node.js tooling

---

## Switching Between Options

### To use Nginx (current):
- Use `Dockerfile` in Dokploy
- Port: `80`

### To use Node.js:
1. In Dokploy, change Dockerfile path to `Dockerfile.node`
2. Set port to `3000` (or configure PORT env var)
3. Redeploy

---

## Important: Binding to 0.0.0.0

**Yes, you need `0.0.0.0`** when using Node.js!

- `localhost` or `127.0.0.1` = only accepts local connections
- `0.0.0.0` = accepts connections from anywhere (required for Docker)

The `server.js` file already binds to `0.0.0.0`, so you're all set if you choose the Node.js option.

---

## Current Recommendation

**Stick with Nginx (Option 1)** - it's already configured and is the best choice for a static React app. Only switch to Node.js if you encounter specific issues with nginx on Dokploy.


