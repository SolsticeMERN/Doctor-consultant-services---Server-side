const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const popularCollection = await client.db("medConsultPro")
    .collection("popular");
    const bookingCollection = await client.db("medConsultPro")
    .collection("booking");

    //    services related api
    app.post("/services", async (req, res) => {
      const newService = req.body;
      const result = await servicesCollection.insertOne(newService);
      console.log(result);
      res.send(result);
    });

    app.get('/servicesDetails/:id', async(req, res) => {
        const id = req.params.id;
        const service = await servicesCollection.findOne({ _id: new ObjectId(id) });
        res.send(service);
    })

    // delete service related api
    app.delete('/deleteService/:id', async(req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const result = await servicesCollection.deleteOne(filter);
        // const result2 = await popularCollection.deleteOne(filter);
        res.send(result);
    })

    // update service related api
    app.put('/updateService/:id', async(req, res) => {
        const id = req.params.id;
        const updatedService = req.body;
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const updateDoc = {
          $set: {
            ...updatedService,
          },
        };
        const result = await servicesCollection.updateOne(filter, updateDoc, options);
        // const result2 = await popularCollection.updateOne(filter, updateDoc, options);
        // res.send({ result, result2 });
        res.send(result);
    })


   
    // popular services related api
    app.get('/popularServices', async (req, res) => {
        const popularServices = await popularCollection.find({}).toArray();
        res.send(popularServices);
    })
  
   
    // booking service related api
    app.post('/booking', async (req, res) => {
        const newBooking = req.body;
        console.log(newBooking);
        const result = await bookingCollection.insertOne(newBooking);
        console.log(result);
        res.send(result);
    })
   
    app.get('/booking/:email', async (req, res) => {
        const email = req.params.email;
        const query = { userEmail: email }
        const booking = await bookingCollection.find(query).toArray();
        res.send(booking);
    })




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


    app.get('/manageService/:email', async(req, res) => {
        const email = req.params.email;
        const query = { userEmail: email }
        const size = parseInt(req.query.size);
        const page = parseInt(req.query.page) - 1;
        const sort = req.query.sort; 
        const search = req.query.search;

        let sortQuery = {};
        if (sort) {
          sortQuery = { price: sort === 'asc' ? 1 : -1 };
        }
        let option = {}
        if (search) {
            option = { serviceName
            : { $regex: search, $options: "i" } };
        }
        const services = await servicesCollection.find(query, option).sort(sortQuery).skip(page * size).limit(size).toArray();
        res.send(services);
    })


    app.get("/manageService/:email/count", async (req, res) => {
        const email = req.params.email;
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
