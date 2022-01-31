import express, { json } from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from "dotenv";
import dayjs from "dayjs";
import joi from 'joi';
import { stripHtml } from 'string-strip-html';

const server = express();
server.use(cors());
server.use(json());
dotenv.config();



const userSchema = joi.object({
    name: joi.string().required()
});

const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().required().valid('message', 'private_message'),
});

async function initMongo() {
    try {
        const mongoClient = new MongoClient(process.env.MONGO_URI);
        await mongoClient.connect();
        const db = mongoClient.db(process.env.MONGO_NAME);
        return { mongoClient, db }

    } catch (err) { statusCode(500).send('Não foi possível conectar com o mongoDB') }
}

setInterval(async () => {
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
}, 15000);


server.get('/teste', (req, res) => {
    res.send('olá');
});


server.post("/participants", async (req, res) => {
    const time = dayjs().format('HH:mm:ss');
    const name = stripHtml(req.body.name).result.trim();

    const validation = userSchema.validate({ name: name });
    if (validation.error) {
        res.sendStatus(422);
        return;
    }

    const { mongoClient, db } = await initMongo();
    const findedUser = await db.collection('participants').findOne({ name: name });
    if (findedUser) {
        res.sendStatus(409);
        mongoClient.close();
        return;
    }

    await db.collection('participants').insertOne({ name, lastStatus: Date.now() });
    await db.collection('messages').insertOne({ from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time });
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
    const body = {
        to: stripHtml(to).result.trim(),
        text: stripHtml(text).result.trim(),
        type: stripHtml(type).result.trim()
    };
    const validation = messageSchema.validate(body);
    if (validation.error) {
        res.sendStatus(422);
        return;
    }
    const { mongoClient, db } = await initMongo();
    const from = stripHtml(req.headers.user).result.trim();
    const time = dayjs().format('HH:mm:ss');

    const findedUser = await db.collection('participants').findOne({ name: from });
    if (!findedUser) {
        res.sendStatus(422);
        mongoClient.close();
        return;
    }

    await db.collection('messages').insertOne({ from, ...body, time });
    mongoClient.close();
    res.sendStatus(201);
});

server.get('/messages', async (req, res) => {
    const { mongoClient, db } = await initMongo();
    let messages = await db.collection('messages').find({}).toArray();

    const name = req.headers.user;
    const limit = parseInt(req.query.limit);
    if (limit) { messages = messages.slice(-limit) }

    messages.map(message => {
        if (message.from !== name && message.to !== name && message.type === 'private_message') {
            const index = messages.indexOf(message);
            messages.splice(index, 1);
        }
    });

    mongoClient.close();
    res.send(messages);
});

server.post('/status', async (req, res) => {
    const name = stripHtml(req.headers.user).result.trim();

    const { mongoClient, db } = await initMongo();
    const dateNow = Date.now();
    try {
        await db.collection('participants').updateOne(
            { name: name }, { $set: { lastStatus: dateNow } }
        );
    } catch {
        res.sendStatus(404);
    }
    mongoClient.close();
    res.sendStatus(200);
});

server.delete('/messages/:id', async (req, res) => {
    const { mongoClient, db } = await initMongo();
    const name = stripHtml(req.headers.user).result.trim();
    const id = stripHtml(req.params.id).result.trim();

    const message = await db.collection('messages').findOne({ _id: new ObjectId(id) });
    if (!message) {
        res.sendStatus(404);
        return;
    } else if (name !== message.from) {
        res.sendStatus(401);
        return;
    }
    await db.collection('messages').deleteOne({ _id: new ObjectId(id) });
    res.sendStatus(200);
    mongoClient.close();
});

server.put('/messages/:id', async (req, res) => {
    const name = stripHtml(req.headers.user).result.trim();
    const time = dayjs().format('HH:mm:ss');
    const id = stripHtml(req.params.id).result.trim();
    const bodyRequest = {
        to: stripHtml(req.body.to).result.trim(),
        text: stripHtml(req.body.text).result.trim(),
        type: stripHtml(req.body.type).result.trim()
    };

    const validationMessage = messageSchema.validate(bodyRequest);
    const validationUser = userSchema.validate({ name: name });
    if (validationMessage.error || validationUser.error) {
        res.sendStatus(422);
        return;
    }
    const { mongoClient, db } = await initMongo();
    const findedUser = await db.collection('participants').findOne({ name: name });
    if (!findedUser) {
        res.sendStatus(422);
        mongoClient.close();
        return;
    }

    const findedMessage = await db.collection('messages').findOne({ _id: new ObjectId(id) });
    if (!findedMessage) {
        res.sendStatus(404);
        mongoClient.close();
        return;
    } else if (findedMessage.from !== name) {
        res.sendStatus(401);
        mongoClient.close();
        return;
    }
    await db.collection('messages').updateOne({ _id: new ObjectId(id) }, { $set: { ...req.body, time } });
    res.sendStatus(200);
});

server.listen(4000);