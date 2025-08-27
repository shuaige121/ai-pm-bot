// ecosystem.config.js
// PM2 配置文件

module.exports = {
  apps: [
    {
      name: 'ai-pm-bot',
      script: './bot-claude.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      env_development: {
        NODE_ENV: 'development'
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      // 错误重启策略
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      // 崩溃后等待时间
      kill_timeout: 3000,
      // 监听文件变化（开发模式）
      ignore_watch: ['node_modules', 'logs', '.git', '*.log'],
      // 合并日志
      merge_logs: true,
      // 日志日期格式
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    },
    {
      name: 'ai-pm-bot-polling',
      script: './bot-polling.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/polling-err.log',
      out_file: './logs/polling-out.log',
      log_file: './logs/polling-combined.log',
      time: true
    }
  ],

  // 部署配置（可选）
  deploy: {
    production: {
      user: 'node',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'https://github.com/your-repo/ai-pm-bot.git',
      path: '/var/www/ai-pm-bot',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
};