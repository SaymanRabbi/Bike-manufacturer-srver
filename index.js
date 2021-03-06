const express = require('express')
const app = express()
const port = process.env.PORT || 5000
const cors = require('cors');
const jwt = require('jsonwebtoken');
app.use(cors());
app.use(express.json());
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require("stripe")(process.env.PAYMENT_KEY);
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
      //order data
      const CollectionUsers = client.db('Users').collection('data')
      //userdata
      const UserCollection = client.db('userData').collection('data')
      //payment collection
      const PaymentCollection = client.db('payment').collection('data')
      //review collection
      const ReviewCollection = client.db('ReviewCollection').collection('review')
      //profile information
      const ProfileCollection = client.db('ProfileCollection').collection('profile')
      //Blog Collection
      const BlogCollection = client.db('BlogCollection').collection('blog')

      //VeryFy User Are Admin Or Not
    const verifyAdmin = async (req, res, next) => {
      const requester = req?.decoded.email;
      const requesterAccount = await UserCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        next();
      } else {
        res.status(403).send({ messages: "Forbiden Access" });
      }
    };
        app.get('/tools',async (req, res) => {
          const query = {}
          const result = await CollectionManufacturer.find(query).toArray()
          const updateresult = result.reverse()
          res.send(updateresult)
        })
      //review
      app.get('/review', async (req, res) => {
        const result = await ReviewCollection.find({}).toArray()
        const reverse = result.reverse()
        res.send(reverse)
      })
      //post review
      app.post('/review', verifyidentity,async (req, res) => {
        const data = req.body;
        const result = await ReviewCollection.insertOne(data)
        res.send(result)
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
      app.put('/product', async (req, res) => {
        const id = req.query.id;
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
        const email = req.query.email;
        const createToken = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
            expiresIn:'1d'
        })
        res.send({createToken})
      })
      app.put('/users',async (req, res) => {
        const email = req.query.email
        const user = req.body;
        const filter = { email: email }
        const options = { upsert: true };
        const updateDoc = {
          $set: user,
          
        }
        const result = await UserCollection.updateOne(filter, updateDoc, options)
        res.send(result)
      })
      //singel user data
      app.get('/userdata', verifyidentity,async (req, res) => {
        const { useremail } = req.query
        const query = { email: useremail }
        const result = await CollectionUsers.find(query).toArray()
        res.send(result)
      })
      //get payment information using by id
      
      app.get('/payment/:id',verifyidentity, async (req, res) => {
        const id = req.params.id;
        const filter = { _id: ObjectId(id) }
        const result = await CollectionUsers.findOne(filter)
        res.send(result)
      })
      //payment method
      app.post("/create-payment-intent",verifyidentity ,async (req, res) => {
        const { price } = req.body;
        const amount = parseInt(price) *100
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: [
            "card"
          ]
        });
        res.send({clientSecret: paymentIntent.client_secret});
      });
      app.patch('/payment/:id', verifyidentity, async (req, res) => {
        const id = req.params.id
        const payment = req.body
        const filter = { _id: ObjectId(id) }
        const updateDoc= {
          $set: {
            paid: true,
            tnxId:payment.tnxid
          }
        }
        const result = await CollectionUsers.updateOne(filter, updateDoc)
        const paymentresult = await PaymentCollection.insertOne(payment)
        res.send({messages:'success',updateDoc})
      })
      //unpaid order delated
      app.delete('/delete/:id', async (req, res) => {
        const id = req.params.id
        const filter = { _id: ObjectId(id) }
        const result = await CollectionUsers.deleteOne(filter)
        res.send(result)
      })
      //profile collection
      app.get('/profiledata', verifyidentity,async (req, res) => {
         const { useremail } = req.query
        const query = { email: useremail }
        const result = await UserCollection.findOne(query)
        res.send(result)
      })
      app.put('/profiledata/:id', async (req, res) => {
        const id = req.params.id;
        const filter = { _id: ObjectId(id) }
        const data = req.body
        const options = { upsert: true };
        const updateDoc = {
          $set: data,
        }
        const result = await UserCollection.updateOne(filter, updateDoc, options)
        res.send(result)
      })
      //is admin
      app.get("/admin", verifyidentity,verifyAdmin, async (req, res) => {
        const email = req.query.email;
        const user = await UserCollection.findOne({ email: email });
        const isAdmin = user?.role === "admin";
        res.send({admin:isAdmin});
      });
      //get all user
      app.get('/getalluser', verifyidentity, async (req, res) => {
        const result = await UserCollection.find({}).toArray()
        res.send(result)
      })
      //make admin
      app.put("/email/admin", verifyidentity,verifyAdmin, async (req, res) => {
        const email = req.query.email;
        const filter = { email: email };
        const updateDoc = {
          $set: { role: "admin" },
        };
        const result = await UserCollection.updateOne(filter, updateDoc);
        res.send(result);
      });
      //get all order data
      app.get('/orderdata', verifyidentity, verifyAdmin,async (req, res) => {
        const result = await CollectionUsers.find({}).toArray()
        res.send(result)
      })
     //manege product
      app.get('/manageproduct', verifyidentity, verifyAdmin,async (req, res) => {
        const result = await CollectionManufacturer.find({}).toArray()
        res.send(result)
      })
      //add Product
      app.post('/addproduct', verifyidentity,verifyAdmin, async (req, res) => {
        const data = req.body;
        const result = await CollectionManufacturer.insertOne(data)
        res.send(result)
      })
      //delete product
      app.delete('/deletepd/:id', async (req, res) => {
        const id = req.params.id
        const filter = { _id: ObjectId(id) }
        const result = await CollectionManufacturer.deleteOne(filter)
        res.send(result)
      })

      
      //shipped Product
      app.patch('/shipped/:id', async (req, res) => {
        const id = req.params.id
        const filter = { _id: ObjectId(id) }
        const updateDoc= {
          $set: {
            shipped: true,
          }
        }
        const result = await CollectionUsers.updateOne(filter, updateDoc)
        res.send({messages:'success',updateDoc})
      })
      //collecet Blog
      app.get('/blog', async (req, res) => {
        const result = await BlogCollection.find({}).toArray()
        res.send(result);
      })
      //get data by id
      app.get('/blog/:id', async (req, res) => {
        const id = req.params.id;
        const filter = { _id: ObjectId(id) }
        const result = await BlogCollection.findOne(filter)
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