/**
 * Aurora Pipeline - PM2 Ecosystem Configuration
 * 
 * Usage:
 *   pm2 start ecosystem.config.js              # Start all apps
 *   pm2 start ecosystem.config.js --only prod  # Start only production app
 *   pm2 stop ecosystem.config.js               # Stop all apps
 *   pm2 restart ecosystem.config.js            # Restart all apps
 *   pm2 delete ecosystem.config.js             # Delete all apps from PM2
 *   pm2 logs aurora-pipeline                   # View logs
 *   pm2 save                                   # Save PM2 process list
 *   pm2 startup                                # Auto-start on system boot
 */

module.exports = {
  apps: [
    {
      name: 'aurora-pipeline',
      script: './dist/index.cjs',
      cwd: '/home/kelvin/Documents/workspace/AURORA-PIPELINE',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_development: {
        NODE_ENV: 'development'
      },
      
      // Auto-restart configuration
      autorestart: true,
      watch: false, // Set to true to watch for file changes in dev
      ignore_watch: ['node_modules', 'dist', 'runs', 'logs'],
      max_restarts: 10,
      min_uptime: '10s',
      
      // Logging
      output: '/home/kelvin/Documents/workspace/AURORA-PIPELINE/logs/out.log',
      error: '/home/kelvin/Documents/workspace/AURORA-PIPELINE/logs/error.log',
      combine_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,
      wait_ready: true,
      
      // Monitoring
      max_memory_restart: '500M',
      
      // Health check endpoint (for monitoring)
      health_check: {
        endpoint: 'http://localhost:3000/health',
        interval: 30000,
        timeout: 5000,
        success_threshold: 3,
        failure_threshold: 5
      }
    }
  ],
  
  // Deploy configuration (optional)
  deploy: {
    production: {
      user: 'aurora',
      host: 'production-server.example.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/aurora-pipeline.git',
      path: '/opt/aurora-pipeline',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production'
    }
  }
};
