import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import Icon from 'react-native-vector-icons/FontAwesome';

import { Home } from "../screens/Home";
import { Music } from "../screens/Music";
import History from "../screens/History";
import { Profile } from "../screens/Profile";

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
  { name: "Home", component: Home, icon: "home" },
  { name: "Music", component: Music, icon: "music" },
  { name: "History", component: History, icon: "history" },
  { name: "Profile", component: Profile, icon: "user" }
];

export function Routes() {
  return (
    <NavigationContainer>
      <Navigator screenOptions={screenOptions}>
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