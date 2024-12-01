// src/routes/index.js
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import Icon from 'react-native-vector-icons/FontAwesome';

import { Music } from "../screens/Music";
import History from "../screens/History";
import { Profile } from "../screens/Profile";
import { Tags } from "../screens/Tags";
import OnlineSearch from "../screens/OnlineSearch";

const { Navigator, Screen } = createBottomTabNavigator();

const screenOptions = {
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
};

const screens = [
  { name: "Music", component: Music, icon: "music" },
  { name: "Discover", component: OnlineSearch, icon: "search-plus" },
  { name: "Tags", component: Tags, icon: "tags" },
  { name: "History", component: History, icon: "history" },
  { name: "Profile", component: Profile, icon: "user" }
];

export function Routes() {
  return (
    <NavigationContainer>
      <Navigator screenOptions={screenOptions} initialRouteName="Music">
        {screens.map(({ name, component, icon }) => (
          <Screen 
            key={name}
            name={name}
            component={component}
            options={{
              tabBarIcon: ({ size, color }) => <Icon name={icon} size={size} color={color} />,
              tabBarHideOnKeyboard: true,
            }}
          />
        ))}
      </Navigator>
    </NavigationContainer>
  );
}