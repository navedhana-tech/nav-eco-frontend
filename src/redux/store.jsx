import { configureStore } from "@reduxjs/toolkit";
import cartSlice from "./cartSlice";

// Suggested code may be subject to a license. Learn more: ~LicenseLog:3127809312.
export const store = configureStore({
  reducer: {
    cart: cartSlice,
  },
  devTools: true
  
})