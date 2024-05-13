require("dotenv").config();
const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const port = process.env.PORT || 3000;

// middleware
app.use(
  cors({
      origin: ['http://localhost:5173', 'https://assignment-10-medconsultpro.web.app'],
      credentials: true,
  }),
)
app.use(express.json());
app.use(cookieParser());

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

// middlwares
const tokenVerify = (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "no token access" });
  }
  if (token) {
    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
      if (err) {
        return res.status(401).send({ message: "token verification error" });
      }
      req.user = decoded;
      next();
    });
  }
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const servicesCollection = await client
      .db("medConsultPro")
      .collection("services");
    const bookingCollection = await client
      .db("medConsultPro")
      .collection("booking");

    // //  auth related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET_KEY, {
        expiresIn: "1d",
      });

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      });
      res.send({ success: true });
    });

    app.post('/logout', async (req, res) => {
      const user = req.body
      res
          .clearCookie('token', {
              maxAge: 0,
              secure: process.env.NODE_ENV === 'production' ? true : false,
              sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          })
          .send({ status: true })
  })
  

    //    services related api
    app.post("/services", async (req, res) => {
      const newService = req.body;
      const result = await servicesCollection.insertOne(newService);
      res.send(result);
    });

    app.get("/servicesDetails/:id", async (req, res) => {
      const id = req.params.id;
      const service = await servicesCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(service);
    });

    // delete service related api
    app.delete("/deleteService/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await servicesCollection.deleteOne(filter);
      res.send(result);
    });

    // update service related api
    app.put("/updateService/:id", async (req, res) => {
      const id = req.params.id;
      const updatedService = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          ...updatedService,
        },
      };
      const result = await servicesCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // popular services related api
    app.get("/popularServices", async (req, res) => {
      const popularServices = await servicesCollection.find({}).limit(6).toArray();
      res.send(popularServices);
    });

    // booking service related api
    app.post("/booking", async (req, res) => {
      const newBooking = req.body;
      const query = {
        userEmail: newBooking.userEmail,
        serviceId: newBooking.serviceId,
      };
      const alreadyBooking = await bookingCollection.findOne(query);
      if (alreadyBooking) {
        return res.status(400).send("you already booked this service");
      }
      const result = await bookingCollection.insertOne(newBooking);
      res.send(result);
    });

    app.get("/booking/:email", tokenVerify, async (req, res) => {
      const tokenOwner = req.user.email;
      const email = req.params.email;
      if (email !== tokenOwner) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { userEmail: email };
      const booking = await bookingCollection.find(query).toArray();
      res.send(booking);
    });

    app.get("/servicesToDo/:email", tokenVerify, async (req, res) => {
      const tokenOwner = req.user?.email;
      const email = req.params?.email;
      if (email !== tokenOwner) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { providerEmail: email };
      const booking = await bookingCollection.find(query).toArray();
      res.send(booking);
    });

    app.patch("/statusUpdate/:id", async (req, res) => {
      const id = req.params.id;
      const { servicesStatus } = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: { servicesStatus: servicesStatus },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
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
        sortQuery = { price: sort === "asc" ? 1 : -1 };
      }
      let query = {};
      if (search) {
        query = { serviceName: { $regex: search, $options: "i" } };
      }
      const services = await servicesCollection
        .find(query)
        .sort(sortQuery)
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(services);
    });

    app.get("/services/count", async (req, res) => {
      const search = req.query.search;
      let query = {};
      if (search) {
        query = { serviceName: { $regex: search, $options: "i" } };
      }
      const count = await servicesCollection.countDocuments(query);
      res.send({ count });
    });

    app.get("/manageService/:email", tokenVerify, async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email };
      const size = parseInt(req.query.size);
      const page = parseInt(req.query.page) - 1;
      const sort = req.query.sort;
      const search = req.query.search;

      let sortQuery = {};
      if (sort) {
        sortQuery = { price: sort === "asc" ? 1 : -1 };
      }
      let option = {};
      if (search) {
        option = { serviceName: { $regex: search, $options: "i" } };
      }
      const services = await servicesCollection
        .find(query, option)
        .sort(sortQuery)
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(services);
    });

    app.get("/manageService/:email/count", async (req, res) => {
      const email = req.params.email;
      const search = req.query.search;
      let query = {};
      if (search) {
        query = { serviceName: { $regex: search, $options: "i" } };
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
