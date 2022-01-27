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
    try {
        const { mongoClient, db } = await initMongo();
        const users = await db.collection('participants').find({}).toArray();
        const dateNow = Date.now();
        const time = dayjs().format('HH:mm:ss');

        for (const user of users) {
            if (user.lastStatus < dateNow - 10000) {
                await db.collection('participants').deleteOne({ name: user.name });
                await db.collection('messages').insertOne({ from: user.name, to: 'Todos', text: 'sai da sala...', type: 'status', time })
            }
        }
        mongoClient.close();
    } catch (err) {
        console.log(err);
    }
}, 15000);



server.post("/participants", async (req, res) => {
    const time = dayjs().format('HH:mm:ss');
    const name = req.body.name;

    const { mongoClient, db } = await initMongo();
    await db.collection('participants').insertOne({ name, lastStatus: Date.now() });
    await db.collection('messages').insertOne({ from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time })
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
    const time = dayjs().format('HH:mm:ss');
    const from = req.headers.user;
    console.log(from);

    const { mongoClient, db } = await initMongo();
    await db.collection('messages').insertOne({ from, to, text, type, time });
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
    const dateNow = Date.now();
    try {
        await db.collection('participants').updateOne(
            { name: req.headers.user }, { $set: { lastStatus: dateNow } }
        );
    } catch {
        res.sendStatus(404);
    }
    mongoClient.close();
    res.sendStatus(200);
});

server.listen(4000);