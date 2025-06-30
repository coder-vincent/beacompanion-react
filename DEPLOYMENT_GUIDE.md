# BEACompanion Deployment Guide

This guide will help you deploy your BEACompanion application across different services and fix the database/authentication issues you're experiencing.

## Architecture Overview

- **Client (Frontend)**: Deployed on Vercel (React/Vite)
- **Server (Backend)**: Deployed on Render (Node.js/Express)
- **Database**: Hosted on Hostinger (MySQL/phpMyAdmin)

## Environment Variables Setup

### 1. Client Environment Variables (Vercel)

In your Vercel dashboard, add the following environment variable:

```
VITE_BACKEND_URL=https://your-app-name.onrender.com
```

**Important**: Replace `your-app-name` with your actual Render app name.

### 2. Server Environment Variables (Render)

In your Render dashboard, add these environment variables:

```
NODE_ENV=production
PORT=4000
CLIENT_URL=https://your-app-name.vercel.app
JWT_SECRET=your_very_secure_jwt_secret_key_here_make_it_long_and_random

# Database Configuration (Get these from Hostinger)
DB_HOST=your-hostinger-mysql-host
DB_PORT=3306
DB_DATABASE=your_database_name
DB_USER=your_database_username
DB_PASS=your_database_password
DB_SSL=true

# Email Configuration (Optional)
SMTP_USER=your_email@domain.com
SMTP_PASS=your_email_password
```

## Getting Database Configuration from Hostinger

1. Log into your Hostinger account
2. Go to **Hosting** → **Manage**
3. In the sidebar, click **Databases**
4. Click on your database name
5. You'll find the connection details:
   - **Database Host**: Use this for `DB_HOST`
   - **Database Name**: Use this for `DB_DATABASE`
   - **Username**: Use this for `DB_USER`
   - **Password**: Use this for `DB_PASS`

## Common Issues and Solutions

### Issue 1: CORS Errors

**Problem**: Browser blocks requests due to CORS policy.
**Solution**: Ensure `CLIENT_URL` in Render matches your exact Vercel domain.

### Issue 2: Authentication Not Working

**Problem**: Cookies not being set/sent properly.
**Solution**:

- Set `NODE_ENV=production` on Render
- Ensure `CLIENT_URL` is set correctly
- The app is already configured for cross-origin cookies

### Issue 3: Database Connection Fails

**Problem**: Can't connect to Hostinger MySQL database.
**Solution**:

- Double-check all database credentials
- Ensure `DB_SSL=true` is set
- Verify your Hostinger database allows remote connections

### Issue 4: 404 Errors on API Calls

**Problem**: Frontend can't reach backend API.
**Solution**:

- Verify `VITE_BACKEND_URL` points to your Render URL
- Make sure your Render app is deployed and running

## Deployment Steps

### Step 1: Deploy Server to Render

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set the build command: `npm install`
4. Set the start command: `npm start`
5. Add all environment variables listed above
6. Deploy

### Step 2: Deploy Client to Vercel

1. Connect your GitHub repository to Vercel
2. Set the root directory to `client`
3. Add the `VITE_BACKEND_URL` environment variable
4. Deploy

### Step 3: Configure Database

1. Access your Hostinger phpMyAdmin
2. Ensure your database exists and is accessible
3. Test the connection using the credentials

## Testing Your Deployment

1. Visit your Vercel URL
2. Try to register a new account
3. Check if login works
4. Verify that the dashboard loads properly

## Troubleshooting Commands

### Check Server Logs (Render)

1. Go to your Render dashboard
2. Click on your web service
3. View the "Logs" tab to see any errors

### Check Client Console (Browser)

1. Open browser developer tools (F12)
2. Check the Console tab for JavaScript errors
3. Check the Network tab to see if API calls are successful

## Security Notes

- Never commit `.env` files to GitHub
- Use strong, random JWT secrets
- Keep database credentials secure
- Enable HTTPS/SSL on all services (should be default)

## Need Help?

If you're still experiencing issues:

1. Check the server logs in Render for database connection errors
2. Verify all environment variables are set correctly
3. Test API endpoints directly using tools like Postman
4. Ensure your domains are spelled correctly in environment variables

Remember to replace all placeholder values (like `your-app-name`, `your-database-name`, etc.) with your actual values!
