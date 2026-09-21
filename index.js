const express = require("express");
const app = express();
const dotenv = require("dotenv")
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

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
    const ideasCollection = database.collection("ideas");

    const commentsCollection = database.collection("commnets");

       app.get("/ideas", async (req, res) => {
  try {
    const result = await ideasCollection.find({}).toArray();

    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Failed to fetch ideas",
    });
  }
});

app.get("/ideas/:id" , async(req,res)=>{

  const id =  req.params.id;

     const query =
            {
              _id : new ObjectId(id)
            }

            const result = await ideasCollection.findOne(query)
            res.send(result)
})


  app.get("/home", async (req, res) => {
  try {
       const result = await ideasCollection.aggregate([{ $limit: 6 }]).toArray();

    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Failed to fetch ideas",
    });
  }
});


    app.post("/ideas", async (req, res) => {
      try {
        const data = req.body;
        const result = await ideasCollection.insertOne(data);
        res.json(result);
      } catch (error) {
        console.error("Post idea error:", error);
        res.status(500).json({ error: error.message });
      }
    });

    //comments

    app.post("/comments", async (req, res) => {
      try {
        const data = req.body;
        const result = await commentsCollection.insertOne(data);
        res.json(result);
      } catch (error) {
        console.error("Post comment error:", error);
        res.status(500).json({ error: error.message });
      }
    });

    app.get("/comments/:ideaId", async (req, res) => {
      try {
        const { ideaId } = req.params;
        let query = { ideaId: ideaId };
        if (ObjectId.isValid(ideaId)) {
          query = { $or: [{ ideaId: ideaId }, { ideaId: new ObjectId(ideaId) }] };
        }

        const result = await commentsCollection.find(query).toArray();
        res.status(200).json(result);
      } catch (error) {
        console.error("Get comments error:", error);
        res.status(500).json({
          message: "Failed to get comments",
          error: error.message,
        });
      }
    });



    app.put("/comments/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { comment } = req.body;

        let query = { _id: id };
        if (ObjectId.isValid(id)) {
          query = { $or: [{ _id: new ObjectId(id) }, { _id: id }] };
        }

        const updateDoc = {
          $set: {
            comment: comment,
          },
        };

        const result = await commentsCollection.updateOne(query, updateDoc);
        res.json(result);
      } catch (error) {
        console.error("Update comment error:", error);
        res.status(500).json({ error: error.message });
      }
    });

    app.patch("/comments/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { comment } = req.body;

        let query = { _id: id };
        if (ObjectId.isValid(id)) {
          query = { $or: [{ _id: new ObjectId(id) }, { _id: id }] };
        }

        const updateDoc = {
          $set: {
            comment: comment,
          },
        };

        const result = await commentsCollection.updateOne(query, updateDoc);
        res.json(result);
      } catch (error) {
        console.error("Update comment error:", error);
        res.status(500).json({ error: error.message });
      }
    });

    app.delete("/comments/:id", async (req, res) => {
      try {
        const { id } = req.params;
        let query = { _id: id };
        if (ObjectId.isValid(id)) {
          query = { $or: [{ _id: new ObjectId(id) }, { _id: id }] };
        }

        const result = await commentsCollection.deleteOne(query);
        console.log("Delete comment result for ID:", id, result);
        res.json(result);
      } catch (error) {
        console.error("Delete comment error:", error);
        res.status(500).json({ error: error.message });
      }
    });


  } finally {
    //
  }
}
run().catch(console.dir);

app.listen( PORT , () => {
    console.log(`Server is running on port ${PORT}`);
});