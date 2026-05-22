const keys = require("./keys");
const redis = require("redis");

// Initialize the primary Redis client
const redisClient = redis.createClient({
  socket: {
    host: keys.redisHost,
    port: keys.redisPort,
    reconnectStrategy: (retries) => {
      console.log(`Worker Redis link lost. Retry attempt: ${retries}`);
      return 1000; // Retry connection every 1 second
    },
  },
});

// Guard the primary client against unhandled network crashes
redisClient.on("error", (err) => console.error("Worker Redis Client Error:", err));

// Duplicate the client context specifically for the subscription channel listener
const sub = redisClient.duplicate();
sub.on("error", (err) => console.error("Worker Redis Subscription Error:", err));

// Execute the async connections safely
redisClient.connect().catch(err => console.error("Worker baseline connection failed:", err));
sub.connect().catch(err => console.error("Worker sub connection failed:", err));

// Recursive Fibonacci calculator
function fib(index) {
  if (index < 2) return 1;
  return fib(index - 1) + fib(index - 2);
}

// Fixed Subscription Model with safe async handling and explicit input range validation
sub.subscribe("insert", async (message) => {
  console.log(`[Worker] Received 'insert' event for value index: ${message}`);
  
  try {
    const parsedIndex = parseInt(message);

    // Validation guard: block negative inputs, text strings, or calculations over 40 (stack overflow hazard)
    if (isNaN(parsedIndex) || parsedIndex < 0 || parsedIndex > 40) {
      console.error(`[Worker] Aborted: ${message} is an invalid index parameter.`);
      await redisClient.hSet("values", message, "Invalid Input");
      return;
    }

    // Perform calculation execution
    const calculatedResult = fib(parsedIndex);

    // Use await to ensure the save transaction successfully resolves inside the try/catch context
    await redisClient.hSet("values", message, calculatedResult.toString());
    console.log(`[Worker] Calculated and updated index ${message}: ${calculatedResult}`);

  } catch (error) {
    // This catch block intercepts any errors and keeps the Node container alive
    console.error(`[Worker] Failed processing calculations for entry ${message}:`, error);
  }
});
