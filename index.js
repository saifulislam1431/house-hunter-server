const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;
const app = express();

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8cnv71c.mongodb.net/?retryWrites=true&w=majority`;

app.use(cors());
app.use(express.json())


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const housesCollection = client.db("houseHunter").collection("houses")
    const usersCollection = client.db("houseHunter").collection("users")


    // Total Houses
    app.get("/total-houses" , async(req,res)=>{
        const result = await housesCollection.estimatedDocumentCount();
        res.send({totalHouse: result});
    })

    // Houses Collection
    app.get("/houses", async(req,res)=>{
      const page = parseInt(req.query.page);
            const limit = parseInt(req.query.limit);
            const skip = page * limit;
      const queryParams = req.query;

      const filter = {};

      if (queryParams.city) {
        filter.city = queryParams.city;
      }
      if (queryParams.bedrooms) {
        filter.bedrooms = parseInt(queryParams.bedrooms);
      }
      if (queryParams.bathrooms) {
        filter.bathrooms = parseInt(queryParams.bathrooms);
      }
      if (queryParams.roomSize) {
        filter.
        room_size = queryParams.roomSize;
      }
      if (queryParams.availabilityFrom) {
        filter.availability_date = {};
        if (queryParams.availabilityFrom) {
          filter.availability_date = queryParams.availabilityFrom;
        }

      }
      if (queryParams.minRent || queryParams.maxRent) {
        filter.rent_per_month= {};
        if (queryParams.minRent) {
          filter.rent_per_month.$gte = parseInt(queryParams.minRent);
        }
        if (queryParams.maxRent) {
          filter.rent_per_month.$lte = parseInt(queryParams.maxRent);
        }
      }

      const houses = await housesCollection.find(filter).skip(skip).limit(limit).toArray();
      res.send(houses)

        
    })

    // Search Api
    const indexKeys = { city: 1 };
        const indexOptions = { name: "title" }
        const result = await housesCollection.createIndex(indexKeys, indexOptions);
    app.get("/houses-by-location/:text",async(req,res)=>{
      const text = req.params.text;
      const result = await housesCollection.find({
        $or:[
          { city: { $regex: text, $options: "i" } }
        ]
      }).toArray()
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Server successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get("/",(req,res)=>{
    res.send("House Hunter server is running")
})

app.listen(port , ()=>{
    console.log(`This app listening at port ${port}`);
})