// This file is responsible for creating the navigation routes of the application.

import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import Icon from 'react-native-vector-icons/FontAwesome';

import { Home } from "../screens/Home";
import { Music } from "../screens/Music";
import History from "../screens/History";
import { Profile } from "../screens/Profile";

const { Navigator, Screen } = createBottomTabNavigator();

export function Routes() {
  return (
    <NavigationContainer>
      <Navigator screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: 'white',
          tabBarInactiveTintColor: 'gray',
          tabBarShowLabel: true,
          tabBarStyle: {
            backgroundColor: '#090909',
            borderTopColor: '#34495e',
            borderTopWidth: 0.8,
            borderTopStyle: 'solid',
            height: 64,
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
          name="History" 
          component={History} 
          options={{
            tabBarIcon: ({ size, color }) => <Icon name="history" size={size} color={color} />,
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