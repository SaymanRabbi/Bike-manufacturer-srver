const express = require('express')
const app = express()
const port = process.env.PORT || 5000
const cors = require('cors');
const jwt = require('jsonwebtoken');
app.use(cors());
app.use(express.json());
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
//jwt middleware
function verifyidentity(req,res,next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
     return res.status(401).send({messages:"Unauthorized access"})
  }
  const authtoken = authHeader.split(' ')[1]

   jwt.verify(authtoken,process.env.ACCESS_TOKEN,function(err, decoded) {
       if (err) {
          return res.status(403).send({messages:"Forbiden"})
       }
       req.decoded = decoded;
       next()
    })
  
}
//connect to database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jqavd.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
    try {
        await client.connect()
        const CollectionManufacturer = client.db('Manufacturer').collection('tools')
      const CollectionUsers = client.db('Users').collection('data')
      const UserCollection = client.db('userData').collection('data')
        app.get('/tools', verifyidentity,async (req, res) => {
            const query = {}
          const result = await CollectionManufacturer.find(query).toArray()
          const updateresult = result.reverse()
            res.send(updateresult)
        })
      //get product by id
      app.get('/product/:id',verifyidentity, async (req, res) => {
        const id = req.params.id;
        const filter = { _id: ObjectId(id) }
        const result = await CollectionManufacturer.findOne(filter)
        res.send(result)
      })
      //user data store
      app.post('/product',verifyidentity, async (req, res) => {
        const data = req.body.product
        const result = await CollectionUsers.insertOne(data)
        res.send({success:result})
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
        res.send({success:result})

      })
      //create jwt token
      app.post('/token', async (req, res) => {
        const userEmail = req.body;
        const createToken = jwt.sign(userEmail, process.env.ACCESS_TOKEN, {
            expiresIn:'1d'
        })
        res.send({createToken})
      })
      app.put('/users',async (req, res) => {
        const email = req.query.email
        console.log(email)
        const user = req.body;
        const filter = { email: email }
        const options = { upsert: true };
        const updateDoc = {
          $set: user,
          
        }
        const result = await UserCollection.updateOne(filter, updateDoc, options)
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