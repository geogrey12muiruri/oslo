const app = require('./app');
const connectDB = require('./services/db');

const PORT = process.env.PORT || 5002;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Document Service running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1); // Exit process if server fails to start
  }
};

startServer();