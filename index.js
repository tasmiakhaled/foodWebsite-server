const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();

const port = process.env.PORT || 5000;

app.use(cors({
    origin: 'https://restaurantapp-bd68c.web.app',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.lqoavff.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// File upload configuration using Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const fileName = Date.now() + '-' + file.originalname;
        cb(null, fileName);
    },
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only image files are allowed.'), false);
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

async function run() {
    try {
        // await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('foodMood');
        const productCollection = db.collection('products');
        const userCollection = db.collection('users');
        const reviewCollection = db.collection('reviews');

        app.get('/foods', async (req, res) => {
            const query = {};
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        });

        app.get('/foods/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const product = await productCollection.findOne(query);
            res.send(product);
        });

        app.post('/addUser', async (req, res) => {
            const user = req.body;
            const existingUser = await userCollection.findOne({ userName: user.userName });

            if (existingUser) {
                // User with the same username already exists
                res.status(409).send('Username already exists');
            } else {
                const result = await userCollection.insertOne(user);
                res.send(result.insertedCount > 0);
            }
        });

        app.get('/users', async (req, res) => {
            const query = {};
            const cursor = userCollection.find(query);
            const users = await cursor.toArray();
            res.send(users);
        });

        app.post('/addReview', upload.single('image'), async (req, res) => {
            const { name, email, rating, review } = req.body;
            const image = req.file ? req.file.path : null;

            const reviewObj = {
                name,
                email,
                rating,
                review,
                image,
            };

            try {
                const result = await reviewCollection.insertOne(reviewObj);
                res.send(result.insertedId);
            } catch (error) {
                console.error('Error:', error);
                res.status(500).send('An error occurred while adding the review.');
            }
        });


        app.get('/reviews', async (req, res) => {
            const query = {};
            const cursor = reviewCollection.find(query);
            const reviews = await cursor.toArray();
            res.send(reviews);
        });

        app.get('/checkUsername', async (req, res) => {
            const { username } = req.query;
            const existingUser = await userCollection.findOne({ userName: username });
          
            if (existingUser) {
              res.send({ available: false });
            } else {
              res.send({ available: true });
            }
          });

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
    } finally {

    }
}

run().catch(err => console.error(err));

app.options('*', cors());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.get('/', (req, res) => {
    res.send('food server is running');
});

app.listen(port, () => {
    console.log(`Food server is running on ${port}`);
});