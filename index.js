const express = require("express");
const app = express();
const dotenv = require("dotenv");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

dotenv.config();

const PORT = process.env.PORT || 5000;
const uri = process.env.MONGO_URI;
const JWT_SECRET = process.env.ACCESS_TOKEN_SECRET || "default_jwt_secret_ideavault";

app.use(cors());
app.use(express.json());

// Simple JWT Verification Middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next();
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized access: token missing" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Unauthorized access: invalid token" });
    }
    req.user = decoded;
    next();
  });
};

// Route to generate JWT Token
app.post("/jwt", (req, res) => {
  try {
    const user = req.body;
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: "Failed to create JWT token", error: error.message });
  }
});

app.get("/", (req, res) => {
  res.send("Hello from the server!");
});

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});



async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    
    const database = client.db("ideavault");
    const ideasCollection = database.collection("ideas");
    const commentsCollection = database.collection("commnets");

    // GET all ideas 
    app.get("/ideas", async (req, res) => {
      try {
        const { search, category } = req.query;

        let query = {};

        if (search) {
          query.title = { $regex: search, $options: "i" };
        }

        if (category) {
          query.category = category;
        }

        const result = await ideasCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to fetch ideas" });
      }
    });

    // GET single idea by id
    app.get("/ideas/:id" , async(req,res)=>{
      const id = req.params.id;
      const query = { _id : new ObjectId(id) }
      const result = await ideasCollection.findOne(query)
      res.send(result)
    })

    // GET home 
    app.get("/home", async (req, res) => {
      try {
        const result = await ideasCollection.aggregate([{ $limit: 6 }]).toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to fetch ideas" });
      }
    });

    // GET ideas by user (private route)
    app.get("/ideas/user/:userId", verifyToken, async (req, res) => {
      try {
        const { userId } = req.params;
        const result = await ideasCollection.find({ userId }).toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to fetch user ideas" });
      }
    });

    // POST new idea (private route)
    app.post("/ideas", verifyToken, async (req, res) => {
      try {
        const data = req.body;
        const result = await ideasCollection.insertOne(data);
        res.json(result);
      } catch (error) {
        console.error("Post idea error:", error);
        res.status(500).json({ error: error.message });
      }
    });

    // PATCH update idea (private route)
    app.patch("/ideas/:id", verifyToken, async (req, res) => {
      try {
        const { id } = req.params;
        const updatedData = req.body;

        delete updatedData._id;

        const result = await ideasCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData }
        );
        res.json(result);
      } catch (error) {
        console.error("Update idea error:", error);
        res.status(500).json({ error: error.message });
      }
    });

    // DELETE idea by id (private route)
    app.delete("/ideas/:id", verifyToken, async (req, res) => {
      try {
        const { id } = req.params;
        const result = await ideasCollection.deleteOne({ _id: new ObjectId(id) });
        res.json(result);
      } catch (error) {
        console.error("Delete idea error:", error);
        res.status(500).json({ error: error.message });
      }
    });

    // POST new comment (private route)
    app.post("/comments", verifyToken, async (req, res) => {
      try {
        const data = req.body;
        const result = await commentsCollection.insertOne(data);
        res.json(result);
      } catch (error) {
        console.error("Post comment error:", error);
        res.status(500).json({ error: error.message });
      }
    });

    // GET comments by ideaId
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
        res.status(500).json({ message: "Failed to get comments", error: error.message });
      }
    });

    // GET comments by userId — for My Interactions page (private route)
    app.get("/comments/user/:userId", verifyToken, async (req, res) => {
      try {
        const { userId } = req.params;
        const userComments = await commentsCollection.find({ userid: userId }).toArray();

        const ideaIds = [...new Set(userComments.map((c) => c.ideaId))];

        const ideas = await Promise.all(
          ideaIds.map(async (ideaId) => {
            try {
              return await ideasCollection.findOne({ _id: new ObjectId(ideaId) });
            } catch {
              return null;
            }
          })
        );

        const validIdeas = ideas.filter(Boolean);
        res.json(validIdeas);
      } catch (error) {
        console.error("Get user interactions error:", error);
        res.status(500).json({ message: "Failed to get interactions", error: error.message });
      }
    });

    // PATCH update comment (private route)
    app.patch("/comments/:id", verifyToken, async (req, res) => {
      try {
        const { id } = req.params;
        const { comment } = req.body;

        let query = { _id: id };
        if (ObjectId.isValid(id)) {
          query = { $or: [{ _id: new ObjectId(id) }, { _id: id }] };
        }

        const result = await commentsCollection.updateOne(query, { $set: { comment } });
        res.json(result);
      } catch (error) {
        console.error("Update comment error:", error);
        res.status(500).json({ error: error.message });
      }
    });

    // DELETE comment by id (private route)
    app.delete("/comments/:id", verifyToken, async (req, res) => {
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