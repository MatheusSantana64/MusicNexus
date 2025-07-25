// App.tsx
// Main application entry point
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { theme } from './src/styles/theme';

import LibraryScreen from './src//Library/LibraryScreen';
import SearchScreen from './src/Search/SearchScreen';
import TagsScreen from './src/Tags/TagsScreen';
import HistoryScreen from './src/History/HistoryScreen';
import ProfileScreen from './src/Profile/ProfileScreen';

const Tab = createBottomTabNavigator();

function TabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Library') {
            iconName = focused ? 'musical-notes' : 'musical-notes-outline';
          } else if (route.name === 'Tags') {
            iconName = focused ? 'pricetag' : 'pricetag-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-circle-outline'; // Fallback icon
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.blue,
        tabBarInactiveTintColor: theme.colors.text.muted,
        tabBarStyle: [
          styles.tabBar,
          {
            paddingBottom: insets.bottom > 0 ? insets.bottom : 5,
            height: 60 + (insets.bottom > 0 ? insets.bottom : 0),
          }
        ],
        headerShown: false,
        tabBarButton: ({ children, onPress, ...props }) => (
          <TouchableOpacity onPress={onPress} activeOpacity={1} style={props.style}>
            {children}
          </TouchableOpacity>
        ),
      })}
    >
      <Tab.Screen 
        name="Library" 
        children={({ navigation }) => <LibraryScreen navigation={navigation} />}
        options={{ 
          title: 'Library',
        }}
      />
      <Tab.Screen 
        name="Search" 
        children={({ navigation }) => <SearchScreen navigation={navigation} />}
        options={{ 
          title: 'Search',
        }}
      />
      <Tab.Screen 
        name="Tags" 
        component={TagsScreen}
        options={{ 
          title: 'Tags',
        }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen}
        options={{ 
          title: 'History',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ 
          title: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <NavigationContainer>
          <TabNavigator />
          <StatusBar style="light" />
        </NavigationContainer>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: theme.colors.background.amoled,
    borderTopWidth: 0,
    borderTopColor: theme.colors.border,
    paddingTop: 5,
  },
});