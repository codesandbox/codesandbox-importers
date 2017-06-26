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
      'post-deploy':
        'yarn && npm run build && pm2 startOrRestart ecosystem.config.js --env production',
    },
  },
};
