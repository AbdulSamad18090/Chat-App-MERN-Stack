import React, { useState } from "react";
import Input from "../../components/input/Index";
import Button from "../../components/button/Index";
import { Link, useNavigate } from "react-router-dom";

const Form = ({ isSignInPage = false }) => {
  const [data, setData] = useState({
    ...(isSignInPage ? {} : { fullName: "" }),
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false); // State to track loading status
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true); // Set loading state to true when form is submitted
    try {
      const res = await fetch(
        `http://localhost:8000/api/${isSignInPage ? "login" : "register"}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      if (res.status === 400) {
        const errorText = await res.text();
        alert(errorText);
      } else {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const resData = await res.json();
          if (resData.token) {
            localStorage.setItem("user:token", resData.token);
            localStorage.setItem("user:detail", JSON.stringify(resData.user));
            navigate("/");
          }
        } else {
          console.log("Received non-JSON response:", await res.text());
        }
      }
    } catch (error) {
      console.error("Error during form submission:", error);
    } finally {
      setIsLoading(false); // Set loading state to false after form submission completes
    }
  };

  return (
    <div className="p-2 m-2 bg-white sm:w-[400px] w-full h-[400px] shadow-lg rounded flex flex-col justify-center items-center">
      <div className="text-4xl font-bold">
        Welcome<span>{isSignInPage ? " Back" : ""}</span>
      </div>
      <div className="text-xl font-thin">
        <span>{isSignInPage ? "Sign in" : "Sign up"}</span> to get started
      </div>
      <form className="w-full" onSubmit={handleSubmit}>
        {/* Input fields */}
        <Input
          name="name"
          type="text"
          label="Enter Your Name"
          className={`${isSignInPage ? "hidden" : "block"}`}
          value={data.fullName}
          isRequired={!isSignInPage}
          onChange={(e) => {
            setData({
              ...data,
              fullName: e.target.value,
            });
          }}
        />
        <Input
          name="email"
          type="email"
          label="Enter Your Email Address"
          value={data.email}
          onChange={(e) => {
            setData({
              ...data,
              email: e.target.value,
            });
          }}
        />
        <Input
          name="password"
          type="password"
          label="Enter Your Password"
          value={data.password}
          onChange={(e) => {
            setData({
              ...data,
              password: e.target.value,
            });
          }}
        />
        {isLoading ? (
          <Button
            label={"Sigining you in ..."}
            disabled={isLoading} // Disable button when form is submitting
          />
        ) : (
          <Button
            label={isSignInPage ? "Sign In" : "Sign Up"}
            type="submit"
            disabled={isLoading} // Disable button when form is submitting
          />
        )}
      </form>
      <p>
        <span>{isSignInPage ? "Do not" : "Already"}</span> have an account?{" "}
        <Link to={isSignInPage ? "/users/sign_up" : "/users/sign_in"}>
          <span className="text-primary underline cursor-pointer">
            {isSignInPage ? "Sign up" : "Sign in"}
          </span>
        </Link>
      </p>
    </div>
  );
};

export default Form;
