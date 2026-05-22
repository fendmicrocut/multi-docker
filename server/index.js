const keys = require("./keys");

// Express App Setup
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Postgres Client Setup
const { Pool } = require("pg");
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort,
});

// Use an event listener to handle reconnection logic gracefully
pgClient.on('error', () => console.log('Lost PG connection, attempting to reconnect...'));

// Connect with a small delay or retry block to give the Postgres container time to boot
setTimeout(() => {
  pgClient.query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .then(() => console.log('PostgreSQL Table checked/created successfully.'))
    .catch((err) => console.log('Database not ready yet, retrying shortly...', err));
}, 5000); // 5-second initial boot delay

// Redis Client Setup
const redis = require("redis");
const redisClient = redis.createClient({
  socket: {
    host: keys.redisHost,
    port: keys.redisPort,
    reconnectStrategy: (retries) => {
      console.log(`Redis connection lost. Retry attempt: ${retries}`);
      return 1000; // reconnect after 1 second
    },
  },
});

// Guard against unhandled Redis client errors killing the app process
redisClient.on('error', (err) => console.error('Redis Client Error:', err));

const redisPublisher = redisClient.duplicate();
redisPublisher.on('error', (err) => console.error('Redis Publisher Error:', err));

// Establish baseline connections
redisClient.connect().catch(err => console.error("Initial Redis connection failed:", err));
redisPublisher.connect().catch(err => console.error("Initial Redis Publisher connection failed:", err));

// Express route handlers

app.get("/", (req, res) => {
  res.send("Hi");
});

app.get("/values/all", async (req, res) => {
  try {
    const values = await pgClient.query("SELECT * from values");
    res.send(values.rows);
  } catch (err) {
    console.error("Error reading from PostgreSQL:", err);
    res.status(500).send([]);
  }
});

app.get("/values/current", async (req, res) => {
  try {
    const values = await redisClient.hGetAll("values");
    // Ensure we return an empty object if the hash doesn't exist yet
    res.send(values || {});
  } catch (err) {
    console.error("Error reading from Redis hash:", err);
    res.status(500).send({});
  }
});

app.post("/values", async (req, res) => {
  const index = req.body.index;

  if (parseInt(index) > 40) {
    return res.status(422).send("Index too high");
  }

  try {
    await redisClient.hSet("values", index, "Nothing yet!");
    await redisPublisher.publish("insert", index);
    
    // Crucial fix: Await the Postgres database transaction inside our try block
    await pgClient.query("INSERT INTO values(number) VALUES($1)", [index]);

    res.send({ working: true });
  } catch (err) {
    console.error("Failed to process transaction request:", err);
    res.status(500).send({ error: "Database transaction failed" });
  }
});

const API_PORT = 5000;

app.listen(API_PORT, '0.0.0.0', () => {
  console.log(`Backend API forcefully locked and listening on port ${API_PORT}`);
});
