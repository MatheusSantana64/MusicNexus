// This is the main file of the application. It is responsible for rendering the routes of the application and the status bar.

import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { Routes } from "./src/routes";
import { initDatabase } from './src/database/databaseSetup';

export default function App() {
  useEffect(() => {
    initDatabase();
  }, []);

  return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <Routes />
      </>
  );
}