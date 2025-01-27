// This is the main file of the application. It is responsible for rendering the routes of the application and the status bar.

import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { Routes } from "./src/routes";
import { initDatabase } from './src/database/databaseSetup';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  useEffect(() => {
    initDatabase();
    const loadSettings = async () => {
      const [showCovers, downloadCovers] = await Promise.all([
        AsyncStorage.getItem('@music_nexus_show_covers'),
        AsyncStorage.getItem('@music_nexus_download_covers'),
      ]);
      // If the settings are not set, the default value is true
      global.showCovers = showCovers !== false ? showCovers : "true";
      global.downloadCovers = downloadCovers !== false ? downloadCovers : "true";
    };
    loadSettings();
  }, []);

  return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <Routes />
      </>
  );
}