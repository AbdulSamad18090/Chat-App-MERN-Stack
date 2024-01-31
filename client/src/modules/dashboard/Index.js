import React, { Suspense, useEffect, useRef, useState } from "react";
import { IoCall } from "react-icons/io5";
import { FaVideo } from "react-icons/fa";
import Input from "../../components/input/Index";
import { IoIosSend } from "react-icons/io";
import { IoIosAddCircleOutline } from "react-icons/io";
import Button from "../../components/button/Index";
import { useNavigate } from "react-router-dom";
import { AiOutlineMenu, AiOutlineClose } from "react-icons/ai";
import { io } from "socket.io-client";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user:detail"))
  );
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState({});
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState([]);
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState(true);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);
  const [socket, setSocket] = useState(null);
  const messageRef = useRef(null);

  useEffect(() => {
    setSocket(io("http://localhost:9090"));
  }, []);

  useEffect(() => {
    socket?.emit("addUser", user?.id);
    socket?.on("getUsers", (users) => {
      console.log("ActiveUsers >>", users);
    });
    socket?.on("getMessage", (data) => {
      console.log("Data >> ", data);
      setMessages((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          { user: data.user, message: data.message },
        ],
      }));
    });
  }, [socket]);

  useEffect(() => {
    messageRef?.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.messages]);

  // Other code remains the same...
  useEffect(() => {
    const loggedInUser = JSON.parse(localStorage.getItem("user:detail"));
    const fetchConversations = async () => {
      const res = await fetch(
        `http://localhost:8000/api/conversation/${loggedInUser.id}`,
        {
          method: "GET",
          headers: {
            "content-type": "application/json",
          },
        }
      );
      const resData = await res.json();
      setConversations(resData);
    };
    fetchConversations();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      const res = await fetch(`http://localhost:8000/api/users/${user?.id}`, {
        method: "GET",
        headers: {
          "content-type": "application/json",
        },
      });
      const resData = await res.json();
      setUsers(resData);
    };
    fetchUsers();
  }, []);

  const handleLogout = () => {
    const confirm = window.confirm("Do you want to logout?");
    if (confirm) {
      localStorage.clear();
      navigate("/users/sign_in");
    }
  };

  const fetchMessages = async (conversationId, receiver) => {
    const res = await fetch(
      `http://localhost:8000/api/message/${conversationId}?senderId=${user?.id}&&receiverId=${receiver?.receiverId}`,
      {
        method: "GET",
        headers: {
          "content-type": "application/json",
        },
      }
    );
    const resData = await res.json();
    setMessages({ messages: resData, receiver, conversationId });
  };

  const sendMessage = async (e) => {
    socket.emit("sendMessage", {
      senderId: user?.id,
      receiverId: messages?.receiver?.receiverId,
      message,
      conversationId: messages?.conversationId,
    });
    const res = await fetch("http://localhost:8000/api/message", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        conversationId: messages?.conversationId,
        senderId: user?.id,
        message,
        receiverId: messages?.receiver?.receiverId,
      }),
    });
    setMessage("");
  };

  return (
    <div className="w-full h-screen flex">
      {/* Left Drawer */}
      <div
        className={`${
          isLeftDrawerOpen ? "block" : "hidden"
        } md:block w-full md:w-[25%] bg-secondary overflow-y-auto overflow-x-hidden md:pt-0 pt-8 h-screen md:fixed absolute md:top-0 md:left-0 md:bottom-0 md:z-50`}
      >
        <div className="flex items-center m-4">
          <div className="border-2 border-primary rounded-full shadow-lg">
            <img
              src="/images/avatar.jpg"
              alt="avatar"
              className=" rounded-full max-w-[75px] max-h-[75px]"
            />
          </div>
          <div className="ml-4">
            <h3 className=" text-2xl md:w-[80px] truncate">{user.fullName}</h3>
            <p className=" text-lg font-thin md:w-[100px] truncate">
              My Account
            </p>
          </div>
        </div>
        <div className=" px-2">
          <Button
            label="Logout"
            onClick={() => {
              handleLogout();
            }}
          />
        </div>
        <hr />
        <div className=" m-4">
          <div className=" text-primary text-lg">Conversations</div>
          {conversations.length > 0 ? (
            conversations.map(({ conversationId, user }) => {
              return (
                <div key={conversationId} className="py-4 border-b-2">
                  <div
                    className=" cursor-pointer flex items-center"
                    onClick={() => {
                      fetchMessages(conversationId, user);
                      setIsLeftDrawerOpen(false);
                    }}
                  >
                    <div className=" rounded-full shadow-lg">
                      <img
                        src={"/images/avatar.jpg"}
                        alt="avatar"
                        className=" rounded-full max-w-[60px] max-h-[60px]"
                      />
                    </div>
                    <div className="ml-4">
                      <h3 className=" text-lg font-semibold md:w-[100px] truncate">
                        {user.fullName}
                      </h3>
                      <p className=" text-sm font-thin md:w-[100px] truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className=" text-center text-lg font-semibold mt-24">
              {" "}
              No Conversations
            </div>
          )}
        </div>
      </div>

      <div className="w-full flex flex-col justify-between bg-white md:ml-[25%] md:mr-[25%]">
        {messages.receiver?.fullName && (
          <div className="flex items-center md:px-10 p-2 md:mt-2 mt-12 mx-2 h-[70px] bg-secondary rounded border-2 border-primary shadow-lg">
            <div>
              <img
                src="/images/avatar.jpg"
                alt="avatar"
                className="rounded-full max-w-[50px] max-h-[50px]"
              />
            </div>
            <div className="flex flex-col ml-4 mr-auto">
              <h3 className="text-lg">{messages.receiver.fullName}</h3>
              <p className="text-sm font-thin text-primary">
                {messages.receiver.email}
              </p>
            </div>
            <div className="flex">
              <IoCall className="text-[25px] cursor-pointer mx-2" />
              <FaVideo className="text-[25px] cursor-pointer mx-2" />
            </div>
          </div>
        )}

        <div className=" w-full h-full mt-2 overflow-y-auto border-b">
          <div className="m-4">
            {messages.messages && messages.messages.length > 0 ? (
              messages.messages.map(({ message, user: { id } = {} }, index) => {
                return (
                  <>
                    <div
                      key={index}
                      className={`p-2 max-w-[60%] my-4 ${
                        id === user.id
                          ? "bg-primary text-secondary rounded-bl-2xl rounded-br-[-10px] ml-auto"
                          : "bg-secondary rounded-br-2xl"
                      } rounded-t-2xl  border border-primary shadow-md `}
                    >
                      {message}
                    </div>
                    <div ref={messageRef}></div>
                  </>
                );
              })
            ) : (
              <div className="text-center text-lg font-semibold mt-24">
                Select Conversation from left menu <br /> Or Start Conversation
                from users on right menu
              </div>
            )}
          </div>
        </div>
        {messages?.receiver?.fullName && (
          <div className="sm:flex">
            <div
              className={`w-full px-2 ${isLeftDrawerOpen ? "hidden" : "block"}`}
            >
              <Input
                label="Type a message..."
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                }}
              />
            </div>
            <div className=" flex">
              <div
                className={`mx-2 flex items-center ${
                  message.length === 0 ? "bg-slate-300" : "bg-primary"
                } bg-primary w-full justify-center my-2 rounded-md cursor-pointer`}
              >
                <button disabled={message.length === 0 ? true : false}>
                  <IoIosSend
                    className={`text-[30px] ${
                      message.length === 0
                        ? " text-slate-600"
                        : "text-secondary cursor-pointer"
                    }   mx-2`}
                    onClick={() => {
                      sendMessage();
                    }}
                  />
                </button>
              </div>
              <div className=" mx-2 w-full flex items-center justify-center bg-primary my-2 rounded-md cursor-pointer">
                <IoIosAddCircleOutline className=" text-[30px] text-secondary cursor-pointer mx-2" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Drawer */}
      <div
        className={`${
          isRightDrawerOpen ? "block" : "hidden"
        } md:block w-full md:w-[25%] bg-secondary overflow-y-auto overflow-x-hidden md:pt-0 pt-12 px-4 h-screen md:bg-transparent md:fixed absolute md:top-0 md:right-0 md:bottom-0 md:z-50`}
      >
        <div className="text-primary text-lg">People</div>
        <div>
          {users.length > 0 ? (
            users.map(({ user, userId }, i) => {
              return (
                <div key={i} className="py-4 border-b-2">
                  <div
                    className=" cursor-pointer flex items-center"
                    onClick={() => {
                      fetchMessages("new", user);
                      setIsRightDrawerOpen(false);
                    }}
                  >
                    <div className=" rounded-full shadow-lg">
                      <img
                        src={"/images/avatar.jpg"}
                        alt="avatar"
                        className=" rounded-full max-w-[60px] max-h-[60px]"
                      />
                    </div>
                    <div className="ml-4">
                      <h3 className=" text-lg font-semibold md:w-[100px] truncate">
                        {user.fullName}
                      </h3>
                      <p className=" text-sm font-thin md:w-[100px] truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className=" text-center text-lg font-semibold mt-24">
              {" "}
              No Users
            </div>
          )}
        </div>
      </div>

      {/* Left Drawer Toggle Button */}
      <button
        className="md:hidden absolute top-4 left-4"
        onClick={() => {
          setIsLeftDrawerOpen(!isLeftDrawerOpen);
          setIsRightDrawerOpen(false);
        }}
      >
        {isLeftDrawerOpen ? <AiOutlineClose /> : <AiOutlineMenu />}
      </button>

      {/* Right Drawer Toggle Button */}
      <button
        className="md:hidden absolute top-4 right-4 p"
        onClick={() => {
          setIsRightDrawerOpen(!isRightDrawerOpen);
          setIsLeftDrawerOpen(false);
        }}
      >
        {isRightDrawerOpen ? <AiOutlineClose /> : <AiOutlineMenu />}
      </button>
    </div>
  );
};

export default Dashboard;
