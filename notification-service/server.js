const { Kafka } = require('kafkajs');

// Kafka setup
const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
});
const consumer = kafka.consumer({ groupId: 'notification-group' });

const runConsumer = async () => {
  try {
    await consumer.connect();
    console.log('Kafka consumer connected');

    await consumer.subscribe({ topic: 'document.created', fromBeginning: true });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const payload = JSON.parse(message.value.toString());
        console.log('Received document.created event:', payload);

        // Example action: Log or send a notification
        console.log(`New document created: ${payload.title} (ID: ${payload.id}) by ${payload.createdBy}`);
        // Add logic here, e.g., send email, push notification, etc.
      },
    });
  } catch (err) {
    console.error('Failed to run Kafka consumer:', err);
  }
};

// Start consumer
runConsumer();

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  await consumer.disconnect();
  console.log('Kafka consumer disconnected');
});