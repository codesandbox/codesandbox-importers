const productionVars = require('./config/production.json');

module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps: [
    // First application
    {
      name: 'Git Extractor',
      script: 'dist/index.js',
      instances: 0,
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        GITHUB_CLIENT_ID: productionVars.GITHUB_CLIENT_ID,
        GITHUB_CLIENT_SECRET: productionVars.GITHUB_CLIENT_SECRET,
      },
    },
  ],

  /**
   * Deployment section
   * http://pm2.keymetrics.io/docs/usage/deployment/
   */
  deploy: {
    production: {
      user: 'bundler',
      host: 'ssh.codesandbox.io',
      ref: 'origin/master',
      repo: 'git@github.com:CompuIves/codesandbox-git-extractor.git',
      path: '/home/bundler',
      'pre-deploy-local':
        'scp config/production.json bundler@ssh.codesandbox.io:./source/config/production.json',
      'post-deploy':
        'yarn && npm run build && pm2 startOrRestart ecosystem.config.js --env production',
    },
  },
};
