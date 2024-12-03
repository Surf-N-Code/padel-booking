import Redis from 'ioredis';

const getRedisClient = () => {
  const client = new Redis(process.env.REDIS_HOST!, {
    tls: {
      rejectUnauthorized: false,
    },
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  });

  client.on('error', (err: any) => {
    if (err?.code !== 'ETIMEDOUT') {
      console.error('Redis Client Error:', err);
    }
  });

  return client;
};

export const redis = getRedisClient();
