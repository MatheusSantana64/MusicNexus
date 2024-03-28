import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { Home } from "../screens/Home";
import { Music } from "../screens/Music";
import { Explore } from "../screens/Explore";
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
            borderTopColor: '#1e272e', // Nav menu top border color
            height: 64, // Nav menu height
          }
        }}>
        <Screen 
          name="Home" 
          component={Home} 
          options={{
            tabBarIcon: ({ size, color }) => <Feather name="home" size={size} color={color} />,
            tabBarHideOnKeyboard: true,
          }}
        />
        <Screen 
          name="Music" 
          component={Music} 
          options={{
            tabBarIcon: ({ size, color }) => <Feather name="music" size={size} color={color} />,
            tabBarHideOnKeyboard: true,
          }}
        />
        <Screen 
          name="Explore" 
          component={Explore} 
          options={{
            tabBarIcon: ({ size, color }) => <Feather name="compass" size={size} color={color} />,
            tabBarHideOnKeyboard: true,
          }}
        />
        <Screen 
          name="Profile" 
          component={Profile}
          options={{
            tabBarIcon: ({ size, color }) => <Feather name="user" size={size} color={color} />,
            tabBarHideOnKeyboard: true,
          }}
        />
      </Navigator>
    </NavigationContainer>
  );
}