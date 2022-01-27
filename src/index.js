import express, { json } from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from "dotenv";
import dayjs from "dayjs";

const server = express();
server.use(cors());
server.use(json());
dotenv.config();

async function initMongo() {
    const mongoClient = new MongoClient(process.env.MONGO_URI);
    await mongoClient.connect();
    const db = mongoClient.db(process.env.MONGO_NAME)
    return { mongoClient, db }
}

setInterval(async () => {
    const { mongoClient, db } = await initMongo();
    const users = await db.collection('participants').find({}).toArray();
    const dateNow = Date.now();

    users = users.find(user => user.lastStatus >= dateNow - 10);
    await db.collection('participants').insertMany([...users]);
    mongoClient.close();
}, 15000);


server.post("/participants", async (req, res) => {
    const time = dayjs().format('HH:mm:ss');

    const { mongoClient, db } = await initMongo();
    await db.collection('participants').insertOne({ name: req.body.name, lastStatus: Date.now() });
    await db.collection('messages').insertOne({ name: req.body.name, to: 'Todos', text: 'entra na sala...', type: 'status', time })
    mongoClient.close();
    res.sendStatus(201);
});

server.get('/participants', async (req, res) => {
    const { mongoClient, db } = await initMongo();
    const users = await db.collection('participants').find({}).toArray();
    mongoClient.close();
    res.send(users);
});

server.post('/messages', async (req, res) => {
    const { to, text, type } = req.body;

    const { mongoClient, db } = await initMongo();
    const time = dayjs().format('HH:mm:ss');
    await db.collection('messages').insertOne({ from: req.header.User, to, text, type, time });
    mongoClient.close();
    res.sendStatus(201);
});

server.get('/messages', async (req, res) => {
    const { mongoClient, db } = await initMongo();
    const messages = await db.collection('messages').find({}).toArray();
    mongoClient.close();
    res.send(messages);
});

server.post('/status', async (req, res) => {
    const { mongoClient, db } = await initMongo();
    const users = await db.collection('participants').find({}).toArray();
    const user = users.find(user => user.name === req.header.User);

    if (user) {
        user.lastStatus = Date.now();
        db.collection('participants').drop();
        db.collection('participants').insertMany([...users]);
        mongoClient.close();
        res.sendStatus(200);
    } else {
        mongoClient.close();
        res.sendStatus(404);
    }
});

server.listen(4000);