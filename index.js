const express = require("express");
const app = express();
const dotenv = require("dotenv")
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");

dotenv.config();

const PORT = process.env.PORT ;
const uri= process.env.MONGO_URI;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Hello from the server!");
});

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
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    
    const database = client.db("ideavault");
        // create collection of destination
    const ideasCollection = database.collection("ideas");
    

  } finally {
    
  }
}
run().catch(console.dir);

app.listen( PORT , () => {
    console.log(`Server is running on port ${PORT}`);
});