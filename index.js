const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const bodyParser = require('body-parser')
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = process.env.PORT || 5000;

//middle wares
app.use(cors());
app.use(express.json());

// console.log(process.env.DB_USER);
// console.log(process.env.DB_PASSWORD);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.lqoavff.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const productCollection = client.db('foodMood').collection('products');
        const userCollection = client.db('foodMood').collection('users');

        app.get('/foods', async (req, res) => {
            const query = {};
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        })

        app.get('/foods/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const product = await productCollection.findOne(query);
            res.send(product);
        })

        app.post('/addUser', async (req, res) => {
            const user = req.body;
            userCollection.insertOne(user)
                .then(result => {
                    res.send(result.insertedCount > 0)
                })
        })

        app.get('/users', async (req, res) => {
            const query = {};
            const cursor = userCollection.find(query);
            const users = await cursor.toArray();
            res.send(users);
        })

        app.get('/users/:userName', async (req, res) => {
            const userName = req.params.userName;
            const query = { userName: userName };
            const user = await userCollection.findOne(query);
            res.send(user);
        })

        app.put('/foods/:id/like', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const update = { $inc: { likes: 1 } };

            try {
                const updatedProduct = await productCollection.findOneAndUpdate(query, update, { returnOriginal: false });
                res.send(updatedProduct);
            } catch (error) {
                res.status(500).send({ error: 'An error occurred while updating the like count.' });
            }
        });

        app.put('/foods/:id/dislike', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const update = { $inc: { dislikes: 1 } };

            try {
                const updatedProduct = await productCollection.findOneAndUpdate(query, update, { returnOriginal: false });
                res.send(updatedProduct);
            } catch (error) {
                res.status(500).send({ error: 'An error occurred while updating the dislike count.' });
            }
        });
    }

    finally {

    }
}

run().catch(err => console.error(err));

io.on('connection', (socket) => {
    console.log(`Socket ${socket.id} connected`);

    // Handle the "check username" event
    socket.on('check-userName', async (userName) => {
        const users = client.db('foodMood').collection('users');
        const user = await users.findOne({ userName });

        if (user) {
            socket.emit('userName-taken');
        } else {
            socket.emit('userName-available');
        }
    });

    // Handle the "disconnect" event
    socket.on('disconnect', () => {
        console.log(`Socket ${socket.id} disconnected`);
    });
});

app.get('/', (req, res) => {
    res.send('food server is running');
})

server.listen(port, () => {
    console.log(`Food server is running on ${port}`);
})