const express = require("express");
require("dotenv").config();
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const io = require("socket.io")(9090, {
  cors: {
    origin: "https://chat-app-mern-stack-omega.vercel.app",
  },
});
// Connect DB
require("./db/connection");

// Import Files
const Users = require("./models/Users");
const Conversations = require("./models/Conversations");
const Messages = require("./models/Messages");

// App Use
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

const port = process.env.PORT || 8000;

// Socket.io
let users = [];
io.on("connection", (socket) => {
  console.log("User Connected", socket.id);
  socket.on("addUser", (userId) => {
    const isUserExists = users.find((user) => user.userId === userId);
    if (!isUserExists) {
      const user = { userId, socketId: socket.id };
      users.push(user);
      io.emit("getUsers", users);
    }
  });

  socket.on(
    "sendMessage",
    async ({ senderId, receiverId, message, conversationId }) => {
      const receiver = users.find((user) => user.userId === receiverId);
      const sender = users.find((user) => user.userId === senderId);
      const user = await Users.findById(senderId);
      if (receiver) {
        io.to(receiver.socketId)
          .to(sender.socketId)
          .emit("getMessage", {
            senderId,
            message,
            conversationId,
            receiverId,
            user: {
              id: user._id,
              fullName: user.fullName,
              email: user.email,
            },
          });
      } else {
        io.to(sender.socketId).emit("getMessage", {
          senderId,
          message,
          conversationId,
          receiverId,
          user: {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
          },
        });
      }
    }
  );

  socket.on("disconnect", () => {
    users = users.filter((user) => user.socketId !== socket.id);
    io.emit("getUsers", users);
  });
  // io.emit("getUsers", socket.userId);
});

// Routes
app.get("/", (req, res) => {
  res.send("Welcome");
});

app.listen(port, () => {
  console.log("listening on port" + port);
});

// REGISTER API
app.post("/api/register", async (req, res, next) => {
  try {
    const { fullName, email, password } = req.body;
    if (!fullName || !email || !password) {
      res.status(400).send("Please fillout the required fields first");
    } else {
      const isAlreadyExists = await Users.findOne({ email });
      if (isAlreadyExists) {
        res.status(400).send("User Already Exists");
      } else {
        const newUser = new Users({ fullName, email });
        // Password encryption
        bcryptjs.hash(password, 10, (err, hashedPassword) => {
          newUser.set("password", hashedPassword);
          newUser.save();
          next();
        });
        return res.status(200).send("User Registered Successfully");
      }
    }
  } catch (error) {
    console.log(error);
  }
});

// LOGIN API --------------------------------------------------------
app.post("/api/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).send("Please Fillout The Required Fields First");
    } else {
      const user = await Users.findOne({ email });
      if (!user) {
        res.status(400).send("User Email or Password is Incorrect");
      } else {
        const validateUser = await bcryptjs.compare(password, user.password);
        if (!validateUser) {
          res.status(400).send("User Email or Password is Incorrect");
        } else {
          const payload = {
            userId: user.id,
            email: user.email,
          };
          const JWT_SECRET_KEY =
            process.env.JWT_SECRET_KEY || "THIS_IS_JWT_SECRET_KEY";
          jwt.sign(
            payload,
            JWT_SECRET_KEY,
            { expiresIn: 84600 }, // 1 day expiry
            async (err, token) => {
              await Users.updateOne(
                { _id: user._id },
                {
                  $set: { token },
                }
              );
              user.save();
              return res.status(200).json({
                user: {
                  id: user._id,
                  email: user.email,
                  fullName: user.fullName,
                },
                token: token,
                refresh_token: user.refresh_token,
              });
            }
          );
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
});

// CREATE-CONVERSATION API ----------------------------------------------------------------
app.post("/api/conversation", async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;
    const newConversation = new Conversations({
      members: [senderId, receiverId],
    });
    await newConversation.save();
    res.status(200).send("Conversation created Successfully");
  } catch (error) {
    console.log(error);
  }
});

// GET-CONVERSATION API ----------------------------------------------------------------
app.get("/api/conversation/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const conversations = await Conversations.find({
      members: { $in: [userId] },
    });

    const conversationUserData = await Promise.all(
      conversations.map(async (conversation) => {
        const receiverId = conversation.members.find(
          (member) => member !== userId
        );

        if (!receiverId) {
          // Handle the case where receiverId is not found
          return null;
        }

        const user = await Users.findById(receiverId);

        if (!user) {
          // Handle the case where user with receiverId is not found
          return null;
        }

        return {
          user: {
            receiverId: user._id,
            email: user.email,
            fullName: user.fullName,
          },
          conversationId: conversation._id,
        };
      })
    );

    // Filter out null entries (handles cases where user or receiverId is not found)
    const validConversationUserData = conversationUserData.filter(Boolean);

    res.status(200).json(validConversationUserData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// CREATE-Message-API----------------------------------------------------------
app.post("/api/message", async (req, res) => {
  try {
    const { conversationId, senderId, receiverId = "", message } = req.body;
    if (!senderId || !message) {
      return res.status(400).send("Please fillout the fields first.");
    }
    if (conversationId === "new" && receiverId) {
      const newConversation = new Conversations({
        members: [senderId, receiverId],
      });
      await newConversation.save();
      const newMessage = new Messages({
        conversationId: newConversation._id,
        senderId,
        message,
      });
      await newMessage.save();
      return res.status(200).send("Message sent successfully.");
    } else if (!conversationId && !receiverId) {
      return res.status(400).send("please fillout the required field first.");
    }
    const newMessage = new Messages({ conversationId, senderId, message });
    await newMessage.save();
    res.status(200).send("Message sent successfully.");
  } catch (error) {
    console.log(error);
  }
});

// GET-MESSAGES-API-------------------------------------------------------------
app.get("/api/message/:conversationId", async (req, res) => {
  try {
    const checkMessages = async (conversationId) => {
      const messages = await Messages.find({ conversationId });
      const messageUserData = Promise.all(
        messages.map(async (message) => {
          const user = await Users.findById(message.senderId);
          return {
            user: { id: user._id, email: user.email, fullName: user.fullName },
            message: message.message,
          };
        })
      );
      res.status(200).json(await messageUserData);
    };
    const conversationId = req.params.conversationId;
    if (conversationId === "new") {
      const checkConversation = await Conversations.find({
        members: { $all: [req.query.senderId, req.query.receiverId] },
      });
      if (checkConversation.length > 0) {
        checkMessages(checkConversation[0]._id);
      } else {
        return res.status(200).json([]);
      }
    } else {
      checkMessages(conversationId);
    }
  } catch (error) {
    console.log(error);
  }
});

// GET USERS API ------------------------------------------------------------
app.get("/api/users/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const users = await Users.find({ _id: { $ne: userId } });
    const userData = Promise.all(
      users.map(async (user) => {
        return {
          user: {
            email: user.email,
            fullName: user.fullName,
            receiverId: user._id,
          },
        };
      })
    );
    res.status(200).json(await userData);
  } catch (error) {
    console.log(error);
  }
});

// RE-GENERATE ACCESS | REFRESH TOKENS ON EXPIRE
// app.post("/api/refresh-token", async (req, res, next) => {
//   try {
//     const { refresh_token } = req.body;
//     const userHeaderToken = req.headers.authorization.split(" ");
//     const userAccessToken = userHeaderToken[1];
//     const JWT_SECRET_KEY =
//       process.env.JWT_SECRET_KEY || "THIS_IS_JWT_SECRET_KEY";
//     const decoded = jwt.verify(userAccessToken, JWT_SECRET_KEY);
//     if (!decoded) {
//       return res.status(400).send("Invalid Auth Token");
//     }
//     req["user"] = decoded;
//     const user = req.user;
//     const { id } = user;

//     const userDbObj = await Users.findOne({ id });

//     if (userDbObj.refresh_token === refresh_token) {
//       const JWT_SECRET_KEY =
//         process.env.JWT_SECRET_KEY || "THIS_IS_JWT_SECRET_KEY";
//       jwt.sign(
//         payload,
//         JWT_SECRET_KEY,
//         { expiresIn: 84600 }, // 1 day expiry
//         async (err, token) => {
//           await Users.updateOne(
//             { _id: user._id },
//             {
//               $set: { token },
//             }
//           );
//           user.save();
//           next();
//         }
//       );

//       const JWT_REFRESH_SECRET_KEY =
//         process.env.JWT_REFRESH_SECRET_KEY || "THIS_IS_JWT_REFRESH_SECRET_KEY";
//       jwt.sign(
//         payload,
//         JWT_REFRESH_SECRET_KEY,
//         { expiresIn: 592200 }, // 7 days expiry
//         async (err, refresh_token) => {
//           await Users.updateOne(
//             { _id: user._id },
//             {
//               $set: { refresh_token },
//             }
//           );
//           user.save();
//           next();
//         }
//       );
//     }
//     const updatedUser = await Users.findOne({ id });

//     res.status(200).json({
//       token: updatedUser.token,
//       refresh_token: updatedUser.refresh_token,
//     });
//   } catch (error) {
//     console.log(error);
//   }
// });

// Gracefully handle shutdown
// process.on("SIGINT", () => {
//   console.log("Closing server...");
//   server.close(() => {
//     console.log("Server closed.");
//     process.exit(0);
//   });
// });
