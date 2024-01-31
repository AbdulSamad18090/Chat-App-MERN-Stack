import React from "react";

const Button = ({
  label = "",
  type = "button",
  isDisabled = false,
  onClick = () => {},
}) => {
  return (
    <>
      <button
        className=" w-full my-2 rounded align-middle select-none font-sans text-center uppercase transition-all disabled:opacity-50 disabled:shadow-none disabled:pointer-events-none text-xs py-3 px-6 bg-primary text-light shadow-md shadow-gray-900/10 hover:shadow-lg hover:shadow-gray-900/20 focus:opacity-[0.85] focus:shadow-none active:opacity-[0.85] active:shadow-none border-r-0"
        type={type}
        disabled={isDisabled}
        onClick={onClick}
      >
        {label}
      </button>
    </>
  );
};

export default Button;
