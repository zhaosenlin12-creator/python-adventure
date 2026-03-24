// PM2 配置文件
// 端口改为 3001，避免与其他应用冲突
module.exports = {
  apps: [
    {
      name: 'game',
      script: 'npm',
      args: 'start',
      cwd: '/www/wwwroot/game',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',  // 限制内存使用，避免占用过多资源
      env: {
        NODE_ENV: 'production',
        PORT: 3003  // 改用3003端口，避免冲突
      },
      error_file: '/www/wwwroot/game/logs/error.log',
      out_file: '/www/wwwroot/game/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    }
  ]
};
