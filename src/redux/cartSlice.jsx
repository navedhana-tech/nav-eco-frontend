import { createSlice } from '@reduxjs/toolkit';

const initialState = JSON.parse(localStorage.getItem('cart')) ?? [];

const saveToLocalStorage = (state) => {
    localStorage.setItem('cart', JSON.stringify(state));
};

// Constants for quantity management
const MIN_QUANTITY = 0.25;
const QUANTITY_STEP = 0.25;

const cartSlice = createSlice({
    name: 'cart',
    initialState,
    reducers: {
        addToCart(state, action) {
            const existingItem = state.find(item => item.id === action.payload.id);
            
            if (existingItem) {
                existingItem.quantity = Number((
                    (Number(existingItem.quantity) || MIN_QUANTITY) + 
                    (Number(action.payload.quantity) || MIN_QUANTITY)
                ).toFixed(2));
            } else {
                state.push({
                    ...action.payload,
                    quantity: Number((Number(action.payload.quantity) || MIN_QUANTITY).toFixed(2))
                });
            }
            saveToLocalStorage(state);
        },

        deleteFromCart(state, action) {
            const newState = state.filter(item => item.id !== action.payload.id);
            saveToLocalStorage(newState);
            return newState;
        },

        incrementQuantity(state, action) {
            const item = state.find(item => item.id === action.payload.id);
            if (item) {
                if (typeof action.payload.quantity !== 'undefined') {
                    // Set quantity directly (for dropdown/select)
                    item.quantity = Number(action.payload.quantity);
                } else {
                    // Increment by step (for +/- buttons)
                item.quantity = Number((
                    (Number(item.quantity) || MIN_QUANTITY) + QUANTITY_STEP
                ).toFixed(2));
                }
            }
            saveToLocalStorage(state);
        },

        decrementQuantity(state, action) {
            const item = state.find(item => item.id === action.payload.id);
            if (item) {
                // Ensure quantity doesn't go below MIN_QUANTITY
                item.quantity = Number((
                    Math.max(MIN_QUANTITY, (Number(item.quantity) || MIN_QUANTITY) - QUANTITY_STEP)
                ).toFixed(2));
            }
            saveToLocalStorage(state);
        },

        clearCart: (state) => {
            localStorage.removeItem('cart'); // Explicitly clear localStorage here
            return []; // Return empty array to clear the cart
        },
    }
});

export const { addToCart, deleteFromCart, incrementQuantity, clearCart, decrementQuantity } = cartSlice.actions;

export default cartSlice.reducer;