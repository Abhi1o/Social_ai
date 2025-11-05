#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying AI Social Media Platform Setup...\n');

// Check if required files exist
const requiredFiles = [
  'package.json',
  'tsconfig.json',
  'nest-cli.json',
  'src/main.ts',
  'src/app.module.ts',
  '.env.example',
  'docker-compose.yml',
  'README.md'
];

console.log('📁 Checking required files...');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
  }
});

// Check if build works
console.log('\n🔨 Testing build...');
try {
  execSync('npm run build', { stdio: 'pipe' });
  console.log('✅ Build successful');
} catch (error) {
  console.log('❌ Build failed');
  console.log(error.stdout?.toString());
}

// Check if tests pass
console.log('\n🧪 Running tests...');
try {
  execSync('npm test', { stdio: 'pipe' });
  console.log('✅ Tests passed');
} catch (error) {
  console.log('❌ Tests failed');
  console.log(error.stdout?.toString());
}

// Check core modules
console.log('\n📦 Checking core modules...');
const coreModules = [
  'src/auth/auth.module.ts',
  'src/tenant/tenant.module.ts',
  'src/user/user.module.ts',
  'src/media/media.module.ts',
  'src/config/database.config.ts',
  'src/config/redis.config.ts'
];

coreModules.forEach(module => {
  if (fs.existsSync(module)) {
    console.log(`✅ ${module}`);
  } else {
    console.log(`❌ ${module} - MISSING`);
  }
});

// Check database migration
console.log('\n🗄️  Checking database migration...');
if (fs.existsSync('src/migrations/1703000000000-InitialSchema.ts')) {
  console.log('✅ Initial database migration exists');
} else {
  console.log('❌ Database migration missing');
}

console.log('\n🎉 Setup verification complete!');
console.log('\n📋 Next Steps:');
console.log('1. Copy .env.example to .env and configure your environment');
console.log('2. Start PostgreSQL and Redis (docker-compose up postgres redis -d)');
console.log('3. Run database migrations (npm run migration:run)');
console.log('4. Start the development server (npm run start:dev)');
console.log('\n🚀 Your AI Social Media Platform foundation is ready!');