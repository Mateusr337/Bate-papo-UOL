import express, { json } from 'express';
import cors from 'cors';
import { MongoClient } from './mongodb';
import dotenv from "dotenv";

const server = express();
server.use(cors());
server.use(json());
dotenv.config();
let db;

function openMongo() {
    const promise = new MongoClient(process.env.MONGO_URI).connect();
    promise.then(mongoClient => {
        db = mongoClient.db("batePapoUOL");
    }).catch(openMongo);
}

function closeMongo() {

}

server.post("/participantes", (req, res) => {
    res.send('ok')
});

server.listen(4000);