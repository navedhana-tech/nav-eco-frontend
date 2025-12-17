import React, { useState, useEffect } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import './utils/debugUtils'; // Import debug utilities

function App() {
  return <RouterProvider router={router} />;
}

export default App;
