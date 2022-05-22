const express = require('express')
const app = express()
const port = process.env.PORT || 5000
const cors = require('cors');

app.use(cors());
app.use(express.json());
require('dotenv').config()
//connect to database

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jqavd.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
    try {
        await client.connect()
        const CollectionManufacturer = client.db('Manufacturer').collection('tools')
        app.get('/tools', async (req, res) => {
            const query = {}
            const result = await CollectionManufacturer.find(query).toArray()
            res.send(result)
        })
      //get product by id
      app.get('/product/:id', async (req, res) => {
        const id = req.params.id;
        const filter = { _id: ObjectId(id) }
        const result = await CollectionManufacturer.findOne(filter)
        res.send(result)
      })
      app.put('/product/:id', async (req, res) => {
        const id = req.params.id;
        const filter = { _id: ObjectId(id)};
        const options = { upsert: true };
        const value = req.body.quantity
        const updateDoc = {
          $set: {
            quantity: value
          },
        };
        const result = await CollectionManufacturer.updateOne(filter, updateDoc, options);
        res.send(result)

      })
        
    }
    finally {
        // await client.close()
    }

}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})