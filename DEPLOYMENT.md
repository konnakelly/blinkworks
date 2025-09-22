# BlinkWorks Deployment Guide

## Deploying to Netlify

### Prerequisites
1. A Netlify account (free tier is fine)
2. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. Firebase project configured and deployed

### Step 1: Prepare Your Repository

1. **Commit all your changes:**
   ```bash
   git add .
   git commit -m "Prepare for Netlify deployment"
   git push origin main
   ```

### Step 2: Deploy to Netlify

#### Option A: Connect via Git (Recommended)

1. Go to [netlify.com](https://netlify.com) and sign in
2. Click "New site from Git"
3. Choose your Git provider (GitHub, GitLab, or Bitbucket)
4. Select your BlinkWorks repository
5. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `out`
   - **Node version:** 18

#### Option B: Drag and Drop

1. Build your project locally:
   ```bash
   npm run build
   ```
2. Go to [netlify.com](https://netlify.com) and sign in
3. Drag the `out` folder to the deploy area

### Step 3: Configure Environment Variables

In your Netlify dashboard:

1. Go to Site settings → Environment variables
2. Add the following variables:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
```

### Step 4: Configure Firebase Storage Rules

Make sure your Firebase Storage rules allow public access for uploaded files:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Step 5: Test Your Deployment

1. Visit your Netlify URL (e.g., `https://your-site-name.netlify.app`)
2. Test all functionality:
   - User registration/login
   - Task creation
   - File uploads
   - Designer marketplace
   - Admin panel

### Step 6: Custom Domain (Optional)

1. In Netlify dashboard, go to Domain settings
2. Add your custom domain
3. Configure DNS settings as instructed
4. Enable HTTPS (automatic with Netlify)

### Troubleshooting

#### Build Errors
- Check that all environment variables are set
- Ensure Firebase project is properly configured
- Check build logs in Netlify dashboard

#### Runtime Errors
- Verify Firebase configuration
- Check browser console for errors
- Ensure all API endpoints are working

#### File Upload Issues
- Verify Firebase Storage rules
- Check CORS settings
- Ensure storage bucket is properly configured

### Performance Optimization

1. **Enable Netlify Analytics** (optional)
2. **Configure CDN** (automatic with Netlify)
3. **Enable compression** (automatic with Netlify)
4. **Set up form handling** if needed

### Security Considerations

1. **Environment Variables**: Never commit `.env` files
2. **Firebase Rules**: Regularly review and update security rules
3. **HTTPS**: Always use HTTPS in production
4. **API Keys**: Rotate keys regularly

### Monitoring

1. **Netlify Analytics**: Monitor site performance
2. **Firebase Console**: Monitor usage and errors
3. **Browser DevTools**: Check for client-side errors

## Support

If you encounter issues:
1. Check the Netlify build logs
2. Verify Firebase configuration
3. Test locally with `npm run build && npm run start`
4. Check browser console for errors
