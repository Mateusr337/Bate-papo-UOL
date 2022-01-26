import express, { json } from 'express';
import cors from 'cors';
import { MongoClient } from './mongodb';

const server = express();
server.use(cors());
server.use(json());

function openMongo() {
    const promise = new MongoClient('mongodb://127.0.0.1:27017/?compressors=disabled&gssapiServiceName=batePapoUOL').connect();
    promise.then(() => {
        db = mongoClient.db("meu_lindo_projeto");
    }).catch(openMongo);
}

server.post("/participantes", (req, res) => {
    res.send('ok')
});

server.listen(4000);