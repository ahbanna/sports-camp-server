const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const app = express();
// payment
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
// const stripe = require("stripe")(
//   "sk_test_51NI6rLBANJNml86HWIBD25esKCdrwUkEdA57r2WbK7lAvyrXb58FRlMha6tIb3rmgYmibNVtnZ1PWTgf7dD3YIJD00bX7N2qQe"
// );
const port = process.env.PORT || 5000;

// middleware

app.use(cors());
app.use(express.json());

// verify jwt starts
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "Unauthorized access" });
  }
  //bearer token
  const token = authorization.split(" ")[1];
  jwt.verify(
    token,
    "76fbbca640e8e562c4b9ab21b45fccf86c8b98da707e92d4b58e3e3e5b975f4ee6c2c8bd8cbaf52ae191e280bed82880c88698f6271f5e7627c85a022f2e6b84",
    (err, decoded) => {
      if (err) {
        return res
          .status(401)
          .send({ error: true, message: "Unauthorized access" });
      }
      req.decoded = decoded;
      next();
    }
  );
};
// verify jwt end

// MongoDB starts

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://sportsCampUser:5l3Ydew9UAMYTAQ9@cluster0.k7baavr.mongodb.net/?retryWrites=true&w=majority`;

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
    // await client.connect();
    // collection starts
    const InstructorCollection = client
      .db("sportsCamp")
      .collection("Instructors");
    const userCollection = client.db("sportsCamp").collection("users");
    const classCollection = client.db("sportsCamp").collection("allclasses");
    const selectedClassCollection = client
      .db("sportsCamp")
      .collection("selectedclasses");
    const paymentCollection = client.db("sportsCamp").collection("payments");
    // collection end

    // create payment intent starts
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseFloat(price) * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });
    // payment intent end

    // payment api starts
    app.post("/payments", verifyJWT, async (req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment);

      res.send(result);
    });
    // payment api end

    // payment READ starts
    app.get("/payments", async (req, res) => {
      let query = {};
      if (req.query?.userEmail) {
        query = { userEmail: req.query.userEmail };
      }
      const cursor = paymentCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // payment READ end

    // gererate jwt token starts
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });
    // jwt end

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
      if (existingUser) {
        return res.send({ message: "This user is already exists " });
      }
      // for google end
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    // user CREATE api to receive data from client side end

    // user READ starts
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    // user READ end

    // check if the user is admin or not starts
    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });
    // check if the user is admin or not end

    // check if the user is instructor or not starts
    app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ instructor: false });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { instructor: user?.role === "instructor" };
      res.send(result);
    });
    // check if the user is instructor or not end

    // make UPDATE user role starts
    app.patch("/users/:role/:id", async (req, res) => {
      const id = req.params.id;
      const role = req.params.role;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: role,
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    // make UPDATE user role ends

    // class CREATE api to receive data from client side starts
    app.post("/allclasses", async (req, res) => {
      const newClass = req.body;
      // insert or add data to the mongodb database
      const result = await classCollection.insertOne(newClass);
      // send result to the client
      res.send(result);
    });
    // class CREATE api to receive data from client side end

    // class READ starts
    app.get("/allclasses", async (req, res) => {
      const cursor = classCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    // class READ end

    // my class READ starts
    app.get("/myclasses", async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const cursor = classCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    // my class READ end

    // my classes UPDATE starts
    app.get("/myclasses/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classCollection.findOne(query);
      res.send(result);
    });
    // To get current information from client side
    app.put("/myclasses/:id", async (req, res) => {
      const id = req.params.id;
      //after getting data from client side, now have to send data to mongodb
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const classes = req.body;
      const updatedclass = {
        $set: {
          className: classes.className,
          classPic: classes.classPic,
          availableSeat: classes.availableSeat,
          price: classes.price,
        },
      };
      const result = await classCollection.updateOne(
        filter,
        updatedclass,
        options
      );
      res.send(result);
    });
    // my classes UPDATE end

    // make approve or denay class  starts
    app.patch("/allclasses/:status/:id", async (req, res) => {
      const id = req.params.id;
      const status = req.params.status;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: status,
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    // make approve or denay class ends

    // selected class CREATE api to receive data from client side starts
    app.post("/selectedclasses", async (req, res) => {
      const newSelect = req.body;
      const result = await selectedClassCollection.insertOne(newSelect);
      res.send(result);
    });
    // selected class CREATE api to receive data from client side end

    // selected class Read starts
    app.get("/selectedclasses", async (req, res) => {
      let query = {};
      if (req.query?.userEmail) {
        query = { userEmail: req.query.userEmail };
      }
      const cursor = selectedClassCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    // selected class RAED end

    // my selected class DELETE starts
    app.delete("/selectedclasses/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: id };
      const result = await selectedClassCollection.deleteOne(query);
      res.send(result);
    });
    // my selected class DELETE end

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
