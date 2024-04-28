// This file is responsible for creating the navigation routes of the application.

import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import Icon from 'react-native-vector-icons/FontAwesome';

import { Home } from "../screens/Home";
import { Music } from "../screens/Music";
//import { Playlists } from "../screens/Playlists";
import { Profile } from "../screens/Profile";

const { Navigator, Screen } = createBottomTabNavigator();

export function Routes() {
  return (
    <NavigationContainer>
      <Navigator screenOptions={{
          headerShown: false, // Hide the page header
          tabBarActiveTintColor: 'white', // Nav menu active icon color
          tabBarInactiveTintColor: 'gray', // Nav menu inactive icon color
          tabBarShowLabel: true, // Nav menu show icons label
          tabBarStyle: { // Nav menu style
            backgroundColor: '#090909', // Nav menu background color
            borderTopColor: '#34495e', // Add a thin grey border at the top
            borderTopWidth: 0.8, // Set the width of the border
            borderTopStyle: 'solid', // Set the style of the border
            height: 64, // Nav menu height
          }
        }}>
        <Screen 
          name="Home" 
          component={Home} 
          options={{
            tabBarIcon: ({ size, color }) => <Icon name="home" size={size} color={color} />,
            tabBarHideOnKeyboard: true,
          }}
        />
        <Screen
          name="Music" 
          component={Music} 
          options={{
            tabBarIcon: ({ size, color }) => <Icon name="music" size={size} color={color} />,
            tabBarHideOnKeyboard: true,
          }}
        />
        <Screen 
          name="Tags" 
          component={Home} 
          options={{
            tabBarIcon: ({ size, color }) => <Icon name="th-list" size={size} color={color} />,
            tabBarHideOnKeyboard: true,
          }}
        />
        <Screen 
          name="Profile" 
          component={Profile}
          options={{
            tabBarIcon: ({ size, color }) => <Icon name="user" size={size} color={color} />,
            tabBarHideOnKeyboard: true,
          }}
        />
      </Navigator>
    </NavigationContainer>
  );
}