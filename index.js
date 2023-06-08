const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// MongoDB starts

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.k7baavr.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // collection starts
    const InstructorCollection = client
      .db("sportsCamp")
      .collection("Instructors");
    const userCollection = client.db("sportsCamp").collection("users");

    // collection end

    // Instructors RAED starts
    app.get("/Instructors", async (req, res) => {
      const cursor = InstructorCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // Instructors RAED end

    // user CREATE api to receive data from client side starts
    app.post("/users", async (req, res) => {
      const user = req.body;
      // for google signup it check is the user already registered or noet starts
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      console.log("Existing user:", existingUser);
      if (existingUser) {
        return res.send({ message: "This user is already exists " });
      }
      // for google end
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    // user CREATE api to receive data from client side end

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// MongoDB end

app.get("/", (req, res) => {
  res.send("Summer camp server is running");
});
app.listen(port, () => {
  console.log(`Summer camp server is running on port:${port}`);
});
