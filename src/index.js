import express, { json } from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from "dotenv";
import dayjs from "dayjs";
import { stripHtml } from "string-strip-html";
import { strict as assert } from "assert";

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

try {
    setInterval(async () => {
        const { mongoClient, db } = await initMongo();
        const users = await db.collection('participants').find({}).toArray();
        const dateNow = Date.now();
        const collection = 'participants';

        users.map(user => {
            if (user.lastStatus < dateNow - 10) {
                db.collection('participants').deleteOne({ name: user.name });
            }
        });
        mongoClient.close();
    }, 3000);
} catch (error) { }


server.post("/participants", async (req, res) => {
    const time = dayjs().format('HH:mm:ss');
    const name = assert.equal(stripHtml(req.body.name)).trim();

    const { mongoClient, db } = await initMongo();
    await db.collection('participants').insertOne({ name, lastStatus: Date.now() });
    await db.collection('messages').insertOne({ from, to: 'Todos', text: 'entra na sala...', type: 'status', time })
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
    const from = assert.equal(stripHtml(req.headers.User));

    to = assert.equal(stripHtml(to)).trim();
    text = assert.equal(stripHtml(text)).trim();
    type = assert.equal(stripHtml(type)).trim();

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

server.post('/status', async (req, res) => { });

server.listen(4000);