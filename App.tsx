// App.tsx
// Main application entry point
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import SearchScreen from './src/screens/SearchScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import { ErrorBoundary } from './src/components/ErrorBoundary';

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
            iconName = focused ? 'library' : 'library-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
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
        name="Search" 
        component={SearchScreen}
        options={{ 
          title: 'Pesquisar',
        }}
      />
      <Tab.Screen 
        name="Library" 
        component={LibraryScreen}
        options={{ 
          title: 'Biblioteca',
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
    backgroundColor: '#111111',
    borderTopWidth: 1,
    borderTopColor: '#333333',
    paddingTop: 5,
  },
});