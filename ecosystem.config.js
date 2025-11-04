module.exports = {
  apps: [
    {
      name: 'strapi',
      cwd: __dirname + '/backend',
      script: 'npm',
      args: 'run start',
      env: { NODE_ENV: 'production' },
      watch: false,
    },
    {
      name: 'skidki-bot',
      cwd: __dirname + '/bot',
      script: 'npm',
      args: 'start',
      env: { NODE_ENV: 'production' },
      watch: false,
    },
  ],
};
