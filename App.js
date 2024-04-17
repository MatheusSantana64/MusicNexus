// This is the main file of the application. It is responsible for rendering the routes of the application and the status bar.

import React from 'react';
import { StatusBar } from 'react-native';
import { Routes } from "./src/routes";

export default function App() {
 return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <Routes />
    </>
 );
}