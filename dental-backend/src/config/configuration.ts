export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/dental_saas',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'super-secret-default-key-for-dev',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
});
