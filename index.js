const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
const app = express();

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8cnv71c.mongodb.net/?retryWrites=true&w=majority`;

app.use(cors());
app.use(express.json())


const verifyToken = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const token = authorization.split(' ')[1]
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    req.user = decoded;
    next();
  });
};

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
    const bookingCollection = client.db("houseHunter").collection("bookings")


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

    // User registration
app.post('/user/sigUp', async (req, res) => {
  const { name, role, phone, email, password,photo } = req.body;

  try {
    // Check if user already exists
    const user = await usersCollection.findOne({ email });
    if (user) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save the user to the database
    await usersCollection.insertOne({
      name,
      role,
      phone,
      email,
      password: hashedPassword,
      photo
    });

    // Generate a JWT token
    const token = jwt.sign({ email, role }, process.env.ACCESS_TOKEN);

    // Return the token and user details
    res.status(201).json({ token, email, name, role,photo });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Failed to register' });
  }
});

// User login
app.post('/user/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the user exists
    const user = await usersCollection.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare the password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate a JWT token
    const token = jwt.sign({ email, role: user.role }, process.env.ACCESS_TOKEN);

    // Return the token and user details
    res.status(200).json({ token, email, name: user.name, role: user.role, photo: user.photo });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Failed to login' });
  }
});

// Get user details
app.get('/user', verifyToken, async (req, res) => {
  const { email } = req.user;

  try {
    // Fetch the user details
    const user = await usersCollection.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return the user details
    res.status(200).json({ email: user.email, name: user.name, role: user.role, photo: user.photo, phone:user.phone });
  } catch (error) {
    console.error('User details error:', error);
    res.status(500).json({ message: 'Failed to fetch user details' });
  }
});

// Houses by user email
app.get("/houses-by", verifyToken, async(req,res)=>{
const email = req.query.email;
const query = {email: email};
const result = await housesCollection.find(query).toArray();
res.send(result)
})

// Add new House API
app.post("/new-house",async(req,res)=>{
  const newData = req.body;
  const result = await housesCollection.insertOne(newData);
  res.send(result)
})

// Delete API
app.delete("/delete-house/:id", verifyToken, async(req,res)=>{
  const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await housesCollection.deleteOne(query)
      res.send(result);
})

// Update API

app.put("/update-houses/:id", async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const options = { upsert: true }
  const newData = req.body;
  const updateDoc = {
    $set: {
      address: newData.address,

      availability_date: newData.availability_date,

      bathrooms: newData.bathrooms,
      bedrooms: newData.bedrooms,

      city: newData.city,
      description: newData.description,
      email: newData.email,
      name: newData.name,

      phone_number: newData.phone_number,
      picture: newData.picture,
      rent_per_month: newData.rent_per_month,
      room_size: newData.room_size,
    }
  }
  const result = await housesCollection.updateOne(filter, updateDoc, options)
  res.send(result)
})

// Add house booking
app.post("/bookings" ,async(req,res)=>{
const data = req.body;
const userEmail = data.userEmail;
const loadData = await bookingCollection.find({userEmail:userEmail}).toArray();
if(loadData.length === 2){
  return res.json("You can't booking more then two house. If your want add new house please cancel one booking from previous bookings.")
}else{
  const result = await bookingCollection.insertOne(data)
  return res.send(result)
}
})

// Get booking data
app.get("/bookings",async(req,res)=>{
  const email = req.query.email;
  const query = {userEmail: email};
  const result = await bookingCollection.find(query).toArray();
  res.send(result)
})

// Delete bookings
app.delete("/delete-bookings/:id",verifyToken, async(req,res)=>{
  const id = req.params.id;
  const query = {_id: new ObjectId(id)};
  const result = await bookingCollection.deleteOne(query);
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