// This script is used by Vercel to build the frontend
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting Vercel build process for frontend...');

// Run the build command
try {
  console.log('Running npm build...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // Verify the dist directory exists
  const distPath = path.join(__dirname, 'dist');
  if (fs.existsSync(distPath)) {
    console.log('Build successful! Dist directory created at:', distPath);
    
    // List files in the dist directory
    const files = fs.readdirSync(distPath);
    console.log('Files in dist directory:', files);
  } else {
    console.error('ERROR: Dist directory not found after build!');
    process.exit(1);
  }
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}

console.log('Vercel build process completed successfully!');
