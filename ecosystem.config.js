module.exports = {
  apps: [
    {
      name: 'assethub-api',
      script: 'dist/index.js',
      cwd: 'D:\\ITSM\\backend',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      max_restarts: 10,
      restart_delay: 3000,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'C:\\AssetHub\\logs\\api-error.log',
      out_file:   'C:\\AssetHub\\logs\\api-out.log',
    },
    {
      name: 'assethub-web',
      script: 'node_modules/vite/bin/vite.js',
      args: 'preview --port 5173 --host 0.0.0.0',
      cwd: 'D:\\ITSM\\frontend',
      env: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'C:\\AssetHub\\logs\\web-error.log',
      out_file:   'C:\\AssetHub\\logs\\web-out.log',
    }
  ]
}
