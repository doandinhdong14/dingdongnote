import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6D4AFF',
        tabBarInactiveTintColor: '#656575',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E6E5E0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hôm nay',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 18, color }}>☀️</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Công việc',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 18, color }}>✓</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: 'Thói quen',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 18, color }}>⚡</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: 'Ghi chú',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 18, color }}>📝</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          title: 'Tài chính',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 18, color }}>💰</Text>
          ),
        }}
      />
    </Tabs>
  );
}
