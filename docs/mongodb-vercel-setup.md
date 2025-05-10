# MongoDB Atlas Configuration for Vercel Deployment

This guide explains how to configure MongoDB Atlas to work properly with Vercel serverless functions.

## Network Access Configuration

One of the most common issues when connecting to MongoDB Atlas from Vercel is network access restrictions. By default, MongoDB Atlas only allows connections from specific IP addresses.

### Option 1: Allow Access from Anywhere (Easiest but Less Secure)

1. Log in to your MongoDB Atlas account
2. Navigate to your cluster
3. Click on "Network Access" in the left sidebar
4. Click "Add IP Address"
5. Click "Allow Access from Anywhere" (sets 0.0.0.0/0)
6. Click "Confirm"

This allows connections from any IP address, which is less secure but ensures Vercel can connect from any of its serverless function regions.

### Option 2: Allow Access from Vercel IP Ranges (More Secure)

Vercel uses various IP ranges for its serverless functions. You can add these ranges to your MongoDB Atlas network access list:

1. Log in to your MongoDB Atlas account
2. Navigate to your cluster
3. Click on "Network Access" in the left sidebar
4. Click "Add IP Address"
5. Add the following IP ranges one by one:
   - `76.76.21.0/24`
   - `76.76.21.0/24`
   - Add more as needed from Vercel's documentation
6. Add a comment like "Vercel Serverless Functions" for each entry
7. Click "Confirm" for each entry

## Database User Configuration

Ensure your database user has the correct permissions:

1. Navigate to "Database Access" in MongoDB Atlas
2. Create or edit a user
3. Set the appropriate permissions (at least "readWrite" on your database)
4. Use a strong password
5. Update your `.env` file with the correct credentials

## Connection String Format

Make sure your connection string in the `.env` file follows this format:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database-name?retryWrites=true&w=majority
```

## Vercel Environment Variables

Ensure your MongoDB connection string is properly set in Vercel:

1. Go to your Vercel project
2. Navigate to "Settings" > "Environment Variables"
3. Add your `MONGODB_URI` with the correct connection string
4. Make sure to add it to all environments (Production, Preview, Development)

## Troubleshooting Connection Issues

If you're still experiencing connection issues:

1. **Check MongoDB Atlas Status**: Ensure your cluster is active and running
2. **Verify Network Access**: Double-check that your network access settings include Vercel's IP ranges
3. **Test Locally First**: Make sure your connection works locally before deploying to Vercel
4. **Check Logs**: Review Vercel logs for specific error messages
5. **Connection Pooling**: Ensure your code is optimized for serverless environments (connection pooling)
6. **Timeouts**: Adjust connection timeouts to be shorter than Vercel's function timeout (10 seconds)

### Fixing ECONNRESET Errors

If you're seeing `ECONNRESET` errors in your Vercel logs, this indicates that the connection was reset by the MongoDB server. This is often caused by:

1. **IP Access Restrictions**: MongoDB Atlas is actively rejecting connections from Vercel's IP addresses
   - Solution: Follow the "Allow Access from Anywhere" or "Allow Access from Vercel IP Ranges" instructions above

2. **Network Firewall Issues**: There might be firewall rules blocking the connection
   - Solution: Contact MongoDB Atlas support to check for any network restrictions

3. **Connection Pool Issues**: Too many connections being opened and closed rapidly
   - Solution: Optimize your connection code to reuse connections and implement proper connection pooling

4. **MongoDB Atlas Cluster Tier**: Free or shared clusters have more limitations
   - Solution: Consider upgrading to a dedicated cluster for production use

5. **MongoDB Atlas Maintenance**: The cluster might be undergoing maintenance
   - Solution: Check the MongoDB Atlas status page and your email for maintenance notifications

## Additional Resources

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Vercel Documentation](https://vercel.com/docs)
- [MongoDB Node.js Driver Documentation](https://mongodb.github.io/node-mongodb-native/)
