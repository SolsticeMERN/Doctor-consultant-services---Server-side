const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

// mongodb server
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.0rmazcr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    const servicesCollection = await client
      .db("medConsultPro")
      .collection("services");

    //    services related api
    app.post("/services", async (req, res) => {
      const newService = req.body;
      const result = await servicesCollection.insertOne(newService);
      console.log(result);
      res.send(result);
    });

    //    pagination related api

    app.get("/services", async (req, res) => {
        const size = parseInt(req.query.size);
        const page = parseInt(req.query.page) - 1;
        const sort = req.query.sort; 
        const search = req.query.search;

        let sortQuery = {};
        if (sort) {
          sortQuery = { price: sort === 'asc' ? 1 : -1 };
        }
        let query = {}
        if (search) {
          query = { serviceName
            : { $regex: search, $options: "i" } };
        }
        const services = await servicesCollection.find(query).sort(sortQuery).skip(page * size).limit(size).toArray();
        res.send(services);
      });

    app.get("/services/count", async (req, res) => {
        const search = req.query.search;
        let query = {}
        if (search) {
          query = { serviceName
            : { $regex: search, $options: "i" } };
        }
      const count = await servicesCollection.countDocuments(query);
      res.send({ count });
    });

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

app.get("/", (req, res) => {
  res.send("Server is Running!");
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
